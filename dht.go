package main

import (
	"bytes"
	"crypto/rand"
	"crypto/sha1"
	"encoding/binary"
	"encoding/hex"
	"net"
	"strconv"
	"time"

	"golang.org/x/time/rate"

	"github.com/marksamman/bencode"
)

var seed = []string{
	"router.bittorrent.com:6881",
	"dht.transmissionbt.com:6881",
	"router.utorrent.com:6881",
}

type nodeID []byte

type node struct {
	addr string
	id   string
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
	copy(id[:10], target[:closeness])
	copy(id[10:], local[closeness:])
	return id
}

func makeQuery(tid string, q string, a map[string]interface{}) map[string]interface{} {
	dict := map[string]interface{}{
		"t": tid,
		"y": "q",
		"q": q,
		"a": a,
	}
	return dict
}

func makeReply(tid string, r map[string]interface{}) map[string]interface{} {
	dict := map[string]interface{}{
		"t": tid,
		"y": "r",
		"r": r,
	}
	return dict
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
	chAnnouncement   chan *announcement
	chNode           chan *node
	localID          nodeID
	conn             *net.UDPConn
	queryTypes       map[string]func(map[string]interface{}, net.UDPAddr)
	friendsLimiter   *rate.Limiter
	announceMaxCache int
	maxFriendsPerSec int
	secret           string
	bootstraps       []string
}

func newDHT(laddr string) (*dht, error) {
	conn, err := net.ListenPacket("udp4", laddr)
	if err != nil {
		return nil, err
	}
	g := &dht{
		localID:          randBytes(20),
		conn:             conn.(*net.UDPConn),
		chNode:           make(chan *node),
		maxFriendsPerSec: 200,
		secret:           string(randBytes(20)),
		bootstraps:       seed,
	}
	g.announceMaxCache = g.maxFriendsPerSec * 2
	g.friendsLimiter = rate.NewLimiter(per(g.maxFriendsPerSec, time.Second), g.maxFriendsPerSec)
	g.chAnnouncement = make(chan *announcement, g.announceMaxCache)
	g.queryTypes = map[string]func(map[string]interface{}, net.UDPAddr){
		"get_peers":     g.onGetPeersQuery,
		"announce_peer": g.onAnnouncePeerQuery,
	}
	go g.listen()
	go g.join()
	go g.makefriends()
	return g, nil
}

func (g *dht) listen() error {
	for {
		buf := make([]byte, 2048)
		n, addr, err := g.conn.ReadFromUDP(buf)
		if err == nil {
			go g.onMessage(buf[:n], *addr)
		}
	}
}

func (g *dht) join() {
	for _, addr := range g.bootstraps {
		g.chNode <- &node{addr: addr, id: string(randBytes(20))}
	}
}

func (g *dht) onMessage(data []byte, from net.UDPAddr) {
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
		g.onQuery(dict, from)
	case "r", "e":
		g.onReply(dict, from)
	}
}

func (g *dht) onQuery(dict map[string]interface{}, from net.UDPAddr) {
	_, ok := dict["t"].(string)
	if !ok {
		return
	}
	q, ok := dict["q"].(string)
	if !ok {
		return
	}
	if f, ok := g.queryTypes[q]; ok {
		f(dict, from)
	}
}

func (g *dht) onReply(dict map[string]interface{}, from net.UDPAddr) {
	r, ok := dict["r"].(map[string]interface{})
	if !ok {
		return
	}
	nodes, ok := r["nodes"].(string)
	if !ok {
		return
	}
	for _, node := range decodeNodes(nodes) {
		if !g.friendsLimiter.Allow() {
			continue
		}
		g.chNode <- node
	}
}

func (g *dht) findNode(to string, target nodeID) {
	d := makeQuery(string(randBytes(2)), "find_node", map[string]interface{}{
		"id":     string(neighborID(target, g.localID)),
		"target": string(randBytes(20)),
	})
	addr, err := net.ResolveUDPAddr("udp4", to)
	if err != nil {
		return
	}
	g.send(d, *addr)
}

func (g *dht) onGetPeersQuery(dict map[string]interface{}, from net.UDPAddr) {
	t := dict["t"].(string)
	a, ok := dict["a"].(map[string]interface{})
	if !ok {
		return
	}
	id, ok := a["id"].(string)
	if !ok {
		return
	}
	d := makeReply(t, map[string]interface{}{
		"id":    string(neighborID([]byte(id), g.localID)),
		"nodes": "",
		"token": g.genToken(from),
	})
	g.send(d, from)
}

func (g *dht) onAnnouncePeerQuery(dict map[string]interface{}, from net.UDPAddr) {
	a, ok := dict["a"].(map[string]interface{})
	if !ok {
		return
	}
	token, ok := a["token"].(string)
	if !ok || !g.validateToken(token, from) {
		return
	}
	if len(g.chAnnouncement) == g.announceMaxCache {
		return
	}
	if ac := g.summarize(dict, from); ac != nil {
		g.chAnnouncement <- ac
	}
}

func (g *dht) summarize(dict map[string]interface{}, from net.UDPAddr) *announcement {
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

func (g *dht) send(dict map[string]interface{}, to net.UDPAddr) error {
	g.conn.WriteToUDP(bencode.Encode(dict), &to)
	return nil
}

func (g *dht) makefriends() {
	for {
		node := <-g.chNode
		g.findNode(node.addr, []byte(node.id))
	}
}

func (g *dht) genToken(from net.UDPAddr) string {
	s := sha1.New()
	s.Write(from.IP)
	s.Write([]byte(g.secret))
	return string(s.Sum(nil))
}

func (g *dht) validateToken(token string, from net.UDPAddr) bool {
	return token == g.genToken(from)
}
