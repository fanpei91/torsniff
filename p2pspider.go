package main

import (
	"bytes"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"net"
	"os"
	"path"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/fanpei91/bencode"
	"github.com/fanpei91/godht"
	"github.com/fanpei91/metawire"
)

const (
	Dir = "torrents"
)

func home() string {
	env := "HOME"
	if runtime.GOOS == "windows" {
		env = "USERPROFILE"
	} else if runtime.GOOS == "plan9" {
		env = "home"
	}
	return os.Getenv(env)
}

type tfile struct {
	name   string
	length int64
}

func (tf *tfile) String() string {
	return fmt.Sprintf("name: %s\n, size: %d\n", tf.name, tf.length)
}

type torrent struct {
	infohashHex string
	name        string
	length      int64
	files       []*tfile
}

func (t *torrent) String() string {
	return fmt.Sprintf(
		"link: %s\nname: %s\nsize: %d\nfile: %d\n",
		fmt.Sprintf("magnet:?xt=urn:btih:%s", t.infohashHex),
		t.name,
		t.length,
		len(t.files),
	)
}

func newTorrent(meta []byte, infohashHex string) (*torrent, error) {
	dict, err := bencode.Decode(bytes.NewBuffer(meta))
	if err != nil {
		return nil, err
	}
	t := &torrent{infohashHex: infohashHex}
	if name, ok := dict["name.utf-8"].(string); ok {
		t.name = name
	} else if name, ok := dict["name"].(string); ok {
		t.name = name
	}
	if length, ok := dict["length"].(int64); ok {
		t.length = length
	}
	var total int64
	if files, ok := dict["files"].([]interface{}); ok {
		for _, file := range files {
			var filename string
			var filelength int64
			if f, ok := file.(map[string]interface{}); ok {
				if inter, ok := f["path.utf-8"].([]interface{}); ok {
					path := make([]string, len(inter))
					for i, v := range inter {
					    path[i] = fmt.Sprint(v)
					}
					filename = strings.Join(path, "/")
				} else if inter, ok := f["path"].([]interface{}); ok {
					path := make([]string, len(inter))
					for i, v := range inter {
					    path[i] = fmt.Sprint(v)
					}
					filename = strings.Join(path, "/")
				}
				if length, ok := f["length"].(int64); ok {
					filelength = length
					total += filelength
				}
				t.files = append(t.files, &tfile{name: filename, length: filelength})
			}
		}
	}
	if t.length == 0 {
		t.length = total
	}
	if len(t.files) == 0 {
		t.files = append(t.files, &tfile{name: t.name, length: t.length})
	}
	return t, nil
}

type blacklist struct {
	container    sync.Map
	expiredAfter time.Duration
}

func newBalckList(expiredAfter time.Duration) *blacklist {
	b := &blacklist{expiredAfter: expiredAfter}
	go b.sweep()
	return b
}

func (b *blacklist) in(addr *net.TCPAddr) bool {
	key := addr.String()
	v, ok := b.container.Load(key)
	if !ok {
		return false
	}
	c := v.(time.Time)
	if c.Sub(time.Now()) > b.expiredAfter {
		b.container.Delete(key)
		return false
	}
	return true
}

func (b *blacklist) add(addr *net.TCPAddr) {
	b.container.Store(addr.String(), time.Now())
}

func (b *blacklist) sweep() {
	for range time.Tick(10 * time.Second) {
		now := time.Now()
		b.container.Range(func(k, v interface{}) bool {
			c := v.(time.Time)
			if c.Sub(now) > b.expiredAfter {
				b.container.Delete(k)
			}
			return true
		})
	}
}

type p2pspider struct {
	laddr      string
	maxFriends int
	maxPeers   int
	secret     string
	timeout    time.Duration
	blacklist  *blacklist
	dir        string
}

func (p *p2pspider) run() {
	tokens := make(chan struct{}, p.maxPeers)
	dht, err := godht.New(
		p.laddr,
		godht.MaxFriendsPerSec(p.maxFriends),
		godht.Secret(p.secret),
	)
	if err != nil {
		panic(err)
	}
	log.Println("running, wait a few minutes...")
	for ac := range dht.Announce {
		tokens <- struct{}{}
		go p.work(ac, tokens)
	}
}

func (p *p2pspider) work(ac *godht.Announce, tokens chan struct{}) {
	defer func() {
		<-tokens
	}()
	if p.isExist(ac.InfohashHex) {
		return
	}
	if p.blacklist.in(ac.Peer) {
		return
	}
	peer := metawire.New(
		string(ac.Infohash),
		ac.Peer.String(),
		metawire.Timeout(p.timeout),
	)
	data, err := peer.Fetch()
	if err != nil {
		p.blacklist.add(ac.Peer)
		return
	}
	_, err = p.save(ac.InfohashHex, data)
	if err != nil {
		return
	}
	t, err := newTorrent(data, ac.InfohashHex)
	if err != nil {
		return
	}
	log.Println(t)
}

func (p *p2pspider) isExist(infohashHex string) bool {
	name, _ := p.pathname(infohashHex)
	_, err := os.Stat(name)
	if os.IsNotExist(err) {
		return false
	}
	return err == nil
}

func (p *p2pspider) save(infohashHex string, data []byte) (string, error) {
	name, dir := p.pathname(infohashHex)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	f, err := os.OpenFile(name, os.O_WRONLY|os.O_CREATE, 0755)
	if err != nil {
		return "", err
	}
	defer f.Close()
	d, err := bencode.Decode(bytes.NewBuffer(data))
	if err != nil {
		return "", err
	}
	_, err = f.Write(bencode.Encode(map[string]interface{}{
		"info": d,
	}))
	if err != nil {
		return "", err
	}
	return name, nil
}

func (p *p2pspider) pathname(infohashHex string) (name string, dir string) {
	dir = path.Join(p.dir, infohashHex[:2], infohashHex[len(infohashHex)-2:])
	name = path.Join(dir, infohashHex+".torrent")
	return
}

func main() {
	addr := flag.String("a", "0.0.0.0", "listen on given address")
	port := flag.Int("p", 6881, "listen on given port")
	maxFriends := flag.Int("f", 500, "max friends to make with per second")
	peers := flag.Int("e", 400, "max peers(TCP) to connenct to download torrent file")
	timeout := flag.Duration("t", 10*time.Second, "max time allowed for downloading torrent file")
	secret := flag.String("s", "$p2pspider$", "token secret")
	dir := flag.String("d", path.Join(home(), Dir), "the directory to store the torrent file")
	verbose := flag.Bool("v", true, "run in verbose mode")
	flag.Parse()
	absDir, err := filepath.Abs(*dir)
	if err != nil {
		panic(err)
	}
	log.SetFlags(0)
	if *verbose {
		log.SetOutput(os.Stdout)
	} else {
		log.SetOutput(ioutil.Discard)
	}
	p := &p2pspider{
		laddr:      fmt.Sprintf("%s:%d", *addr, *port),
		timeout:    *timeout,
		maxFriends: *maxFriends,
		maxPeers:   *peers,
		secret:     *secret,
		dir:        absDir,
		blacklist:  newBalckList(10 * time.Minute),
	}
	p.run()
}
