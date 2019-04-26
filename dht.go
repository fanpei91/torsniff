package main

import (
	"bytes"
	"container/list"
	"crypto/rand"
	"crypto/sha1"
	"encoding/binary"
	"encoding/hex"
	"net"
	"strconv"
	"sync"
	"time"

	"github.com/marksamman/bencode"
	"golang.org/x/time/rate"
)

var seeds = []string{
	"router.bittorrent.com:6881",
	"dht.transmissionbt.com:6881",
	"router.utorrent.com:6881",
}

type nodeID []byte

type node struct {
	addr string
	id   string
}

type announcements struct {
	mu    sync.RWMutex
	ll    *list.List
	limit int
	input chan struct{}
}

func (a *announcements) get() *announcement {
	a.mu.Lock()
	defer a.mu.Unlock()

	if elem := a.ll.Front(); elem != nil {
		ac := elem.Value.(*announcement)
		a.ll.Remove(elem)
		return ac
	}

	return nil
}

func (a *announcements) put(ac *announcement) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.ll.Len() >= a.limit {
		return
	}

	a.ll.PushBack(ac)

	select {
	case a.input <- struct{}{}:
	default:
	}
}

func (a *announcements) wait() <-chan struct{} {
	return a.input
}

func (a *announcements) len() int {
	a.mu.RLock()
	defer a.mu.RUnlock()

	return a.ll.Len()
}

func (a *announcements) full() bool {
	return a.len() >= a.limit
}

type announcement struct {
	raw         map[string]interface{}
	from        net.UDPAddr
	peer        net.Addr
	infohash    []byte
	infohashHex string
}

func randBytes(n int) []byte {
	b := make([]byte, n)
	rand.Read(b)
	return b
}

func neighborID(target nodeID, local nodeID) nodeID {
	const closeness = 15
	id := make([]byte, 20)
	copy(id[:closeness], target[:closeness])
	copy(id[closeness:], local[closeness:])
	return id
}

func makeQuery(tid string, q string, a map[string]interface{}) map[string]interface{} {
	return map[string]interface{}{
		"t": tid,
		"y": "q",
		"q": q,
		"a": a,
	}
}

func makeReply(tid string, r map[string]interface{}) map[string]interface{} {
	return map[string]interface{}{
		"t": tid,
		"y": "r",
		"r": r,
	}
}

func decodeNodes(s string) (nodes []*node) {
	length := len(s)
	if length%26 != 0 {
		return
	}

	for i := 0; i < length; i += 26 {
		id := s[i : i+20]
		ip := net.IP([]byte(s[i+20 : i+24])).String()
		port := binary.BigEndian.Uint16([]byte(s[i+24 : i+26]))
		addr := ip + ":" + strconv.Itoa(int(port))
		nodes = append(nodes, &node{id: id, addr: addr})
	}

	return
}

func per(events int, duration time.Duration) rate.Limit {
	return rate.Every(duration / time.Duration(events))
}

type dht struct {
	mu             sync.Mutex
	announcements  *announcements
	chNode         chan *node
	die            chan struct{}
	errDie         error
	localID        nodeID
	conn           *net.UDPConn
	queryTypes     map[string]func(map[string]interface{}, net.UDPAddr)
	friendsLimiter *rate.Limiter
	secret         []byte
	seeds          []string
}

func newDHT(laddr string, maxFriendsPerSec int) (*dht, error) {
	conn, err := net.ListenPacket("udp", laddr)
	if err != nil {
		return nil, err
	}

	d := &dht{
		announcements: &announcements{
			ll:    list.New(),
			limit: maxFriendsPerSec * 10,
			input: make(chan struct{}, 1),
		},
		localID: randBytes(20),
		conn:    conn.(*net.UDPConn),
		chNode:  make(chan *node),
		die:     make(chan struct{}),
		secret:  randBytes(20),
	}
	d.friendsLimiter = rate.NewLimiter(per(maxFriendsPerSec, time.Second), maxFriendsPerSec)
	d.queryTypes = map[string]func(map[string]interface{}, net.UDPAddr){
		"get_peers":     d.onGetPeersQuery,
		"announce_peer": d.onAnnouncePeerQuery,
	}
	return d, nil
}

func (d *dht) run() {
	go d.listen()
	go d.join()
	go d.makeFriends()
}

func (d *dht) listen() {
	buf := make([]byte, 2048)
	for {
		n, addr, err := d.conn.ReadFromUDP(buf)
		if err == nil {
			d.onMessage(buf[:n], *addr)
		} else {
			d.errDie = err
			close(d.die)
			break
		}
	}
}

func (d *dht) join() {
	const timesForSure = 3
	for i := 0; i < timesForSure; i++ {
		for _, addr := range seeds {
			select {
			case d.chNode <- &node{
				addr: addr,
				id:   string(randBytes(20)),
			}:
			case <-d.die:
				return
			}
		}
	}
}

func (d *dht) onMessage(data []byte, from net.UDPAddr) {
	dict, err := bencode.Decode(bytes.NewBuffer(data))
	if err != nil {
		return
	}

	y, ok := dict["y"].(string)
	if !ok {
		return
	}

	switch y {
	case "q":
		d.onQuery(dict, from)
	case "r", "e":
		d.onReply(dict, from)
	}
}

func (d *dht) onQuery(dict map[string]interface{}, from net.UDPAddr) {
	_, ok := dict["t"].(string)
	if !ok {
		return
	}

	q, ok := dict["q"].(string)
	if !ok {
		return
	}

	if handle, ok := d.queryTypes[q]; ok {
		handle(dict, from)
	}
}

func (d *dht) onReply(dict map[string]interface{}, from net.UDPAddr) {
	r, ok := dict["r"].(map[string]interface{})
	if !ok {
		return
	}

	nodes, ok := r["nodes"].(string)
	if !ok {
		return
	}

	for _, node := range decodeNodes(nodes) {
		if !d.friendsLimiter.Allow() {
			continue
		}

		d.chNode <- node
	}
}

func (d *dht) findNode(to string, target nodeID) {
	q := makeQuery(string(randBytes(2)), "find_node", map[string]interface{}{
		"id":     string(neighborID(target, d.localID)),
		"target": string(randBytes(20)),
	})

	addr, err := net.ResolveUDPAddr("udp", to)
	if err != nil {
		return
	}

	d.send(q, *addr)
}

func (d *dht) onGetPeersQuery(dict map[string]interface{}, from net.UDPAddr) {
	tid, ok := dict["t"].(string)
	if !ok {
		return
	}

	a, ok := dict["a"].(map[string]interface{})
	if !ok {
		return
	}

	id, ok := a["id"].(string)
	if !ok {
		return
	}

	r := makeReply(tid, map[string]interface{}{
		"id":    string(neighborID([]byte(id), d.localID)),
		"nodes": "",
		"token": d.makeToken(from),
	})
	d.send(r, from)
}

func (d *dht) onAnnouncePeerQuery(dict map[string]interface{}, from net.UDPAddr) {
	if d.announcements.full() {
		return
	}

	a, ok := dict["a"].(map[string]interface{})
	if !ok {
		return
	}

	token, ok := a["token"].(string)
	if !ok || !d.validateToken(token, from) {
		return
	}

	if ac := d.summarize(dict, from); ac != nil {
		d.announcements.put(ac)
	}
}

func (d *dht) summarize(dict map[string]interface{}, from net.UDPAddr) *announcement {
	a, ok := dict["a"].(map[string]interface{})
	if !ok {
		return nil
	}

	infohash, ok := a["info_hash"].(string)
	if !ok {
		return nil
	}

	port := int64(from.Port)
	if impliedPort, ok := a["implied_port"].(int64); ok && impliedPort == 0 {
		if p, ok := a["port"].(int64); ok {
			port = p
		}
	}

	return &announcement{
		raw:         dict,
		from:        from,
		infohash:    []byte(infohash),
		infohashHex: hex.EncodeToString([]byte(infohash)),
		peer:        &net.TCPAddr{IP: from.IP, Port: int(port)},
	}
}

func (d *dht) send(dict map[string]interface{}, to net.UDPAddr) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	d.conn.WriteToUDP(bencode.Encode(dict), &to)
	return nil
}

func (d *dht) makeFriends() {
	for {
		select {
		case node := <-d.chNode:
			d.findNode(node.addr, []byte(node.id))
		case <-d.die:
			return
		}
	}
}

func (d *dht) makeToken(from net.UDPAddr) string {
	s := sha1.New()
	s.Write([]byte(from.String()))
	s.Write(d.secret)
	return string(s.Sum(nil))
}

func (d *dht) validateToken(token string, from net.UDPAddr) bool {
	return token == d.makeToken(from)
}
