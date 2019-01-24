package main

import (
	"container/list"
	"sync"
	"time"
)

type entry struct {
	addr  string
	ctime time.Time
}

type blackList struct {
	mu           sync.Mutex
	ll           *list.List
	cache        map[string]*list.Element
	expiredAfter time.Duration
	limit        int
}

func newBlackList(expiredAfter time.Duration, limit int) *blackList {
	return &blackList{
		ll:           list.New(),
		cache:        make(map[string]*list.Element),
		expiredAfter: expiredAfter,
		limit:        limit,
	}
}

func (b *blackList) add(addr string) {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.removeExpiredLocked()

	if b.ll.Len() >= b.limit {
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
	b.mu.Lock()
	defer b.mu.Unlock()

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

func (b *blackList) removeExpiredLocked() {
	now := time.Now()
	var next *list.Element
	for elem := b.ll.Front(); elem != nil; elem = next {
		next = elem.Next()
		e := elem.Value.(*entry)
		if now.Sub(e.ctime) < b.expiredAfter {
			break
		}
		b.ll.Remove(elem)
		delete(b.cache, e.addr)
	}
}
