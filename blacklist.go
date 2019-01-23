package main

import (
	"container/list"
	"time"
)

type entry struct {
	addr  string
	ctime time.Time
}

type blackList struct {
	ll           *list.List
	cache        map[string]*list.Element
	expiredAfter time.Duration
	maxEntries   int
}

func newBlackList(expiredAfter time.Duration, maxEntries int) *blackList {
	return &blackList{
		ll:           list.New(),
		cache:        make(map[string]*list.Element),
		expiredAfter: expiredAfter,
		maxEntries:   maxEntries,
	}
}

func (b *blackList) add(addr string) {
	var next *list.Element
	for elem := b.ll.Front(); elem != nil; elem = next {
		next = elem.Next()
		e := elem.Value.(*entry)
		if time.Now().Sub(e.ctime) < b.expiredAfter {
			break
		}
		b.ll.Remove(elem)
		delete(b.cache, e.addr)
	}

	if b.ll.Len() >= b.maxEntries {
		return
	}

	if _, ok := b.cache[addr]; !ok {
		e := b.ll.PushBack(&entry{
			addr:  addr,
			ctime: time.Now(),
		})
		b.cache[addr] = e
	}

}

func (b *blackList) has(addr string) bool {
	if elem := b.cache[addr]; elem != nil {
		e := elem.Value.(*entry)
		if time.Now().Sub(e.ctime) < b.expiredAfter {
			return true
		}
		b.ll.Remove(elem)
		delete(b.cache, e.addr)
	}

	return false
}
