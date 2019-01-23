package main

import "sync"

var packetPool = newBytesPool(2048)

type bytesPool struct {
	space int
	cache sync.Pool
}

func newBytesPool(space int) *bytesPool {
	return &bytesPool{
		cache: sync.Pool{
			New: func() interface{} {
				return make([]byte, space)
			},
		},
		space: space,
	}
}

func (p *bytesPool) get() []byte {
	return p.cache.Get().([]byte)
}

func (p *bytesPool) put(b []byte) {
	if cap(b) != p.space {
		return
	}
	p.cache.Put(b[:cap(b)])
}
