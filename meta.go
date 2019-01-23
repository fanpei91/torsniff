package main

import (
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"net"
	"sync"
	"time"

	"github.com/marksamman/bencode"
)

const (
	perBlock        = 16384
	maxMetadataSize = perBlock * 1024
	extended        = 20
	extHandshake    = 0
)

var (
	errExtHeader    = errors.New("invalid extension header response")
	errInvalidPiece = errors.New("invalid piece response")
	errTimeout      = errors.New("time out")
)

var metaWirePool = sync.Pool{
	New: func() interface{} {
		return &metaWire{}
	},
}

type metaWire struct {
	infohash     string
	from         string
	peerID       string
	conn         *net.TCPConn
	timeout      time.Duration
	metadataSize int
	utMetadata   int
	numOfPieces  int
	pieces       [][]byte
	err          error
}

func newMetaWire(infohash string, from string, timeout time.Duration) *metaWire {
	w := metaWirePool.Get().(*metaWire)
	w.infohash = infohash
	w.from = from
	w.peerID = string(randBytes(20))
	w.timeout = timeout
	w.conn = nil
	w.err = nil
	return w
}

func (mw *metaWire) fetch() ([]byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), mw.timeout)
	defer cancel()
	return mw.fetchCtx(ctx)
}

func (mw *metaWire) fetchCtx(ctx context.Context) ([]byte, error) {
	mw.connect(ctx)
	mw.handshake(ctx)
	mw.onHandshake(ctx)
	mw.extHandshake(ctx)

	if mw.err != nil {
		if mw.conn != nil {
			mw.conn.Close()
		}
		return nil, mw.err
	}

	for {
		data, err := mw.next(ctx)
		if err != nil {
			return nil, err
		}

		if data[0] != extended {
			continue
		}

		if err := mw.onExtended(ctx, data[1], data[2:]); err != nil {
			return nil, err
		}

		if !mw.checkDone() {
			continue
		}

		m := bytes.Join(mw.pieces, []byte(""))
		sum := sha1.Sum(m)
		if bytes.Equal(sum[:], []byte(mw.infohash)) {
			return m, nil
		}

		return nil, errors.New("metadata checksum mismatch")
	}
}

func (mw *metaWire) connect(ctx context.Context) {
	conn, err := net.DialTimeout("tcp", mw.from, mw.timeout)
	if err != nil {
		mw.err = fmt.Errorf("connect to remote peer failed: %v", err)
		return
	}

	mw.conn = conn.(*net.TCPConn)
}

func (mw *metaWire) handshake(ctx context.Context) {
	if mw.err != nil {
		return
	}

	select {
	case <-ctx.Done():
		mw.err = errTimeout
		return
	default:
	}

	buf := bytes.NewBuffer(nil)
	buf.Write(mw.preHeader())
	buf.WriteString(mw.infohash)
	buf.WriteString(mw.peerID)
	_, mw.err = mw.conn.Write(buf.Bytes())
}

func (mw *metaWire) onHandshake(ctx context.Context) {
	if mw.err != nil {
		return
	}

	select {
	case <-ctx.Done():
		mw.err = errTimeout
		return
	default:
	}

	res, err := mw.read(ctx, 68)
	if err != nil {
		mw.err = err
		return
	}

	if !bytes.Equal(res[:20], mw.preHeader()[:20]) {
		mw.err = errors.New("remote peer not supporting bittorrent protocol")
		return
	}

	if res[25]&0x10 != 0x10 {
		mw.err = errors.New("remote peer not supporting extension protocol")
		return
	}

	if !bytes.Equal(res[28:48], []byte(mw.infohash)) {
		mw.err = errors.New("invalid bittorrent header response")
		return
	}
}

func (mw *metaWire) extHandshake(ctx context.Context) {
	if mw.err != nil {
		return
	}

	select {
	case <-ctx.Done():
		mw.err = errTimeout
		return
	default:
	}

	data := append([]byte{extended, extHandshake}, bencode.Encode(map[string]interface{}{
		"m": map[string]interface{}{
			"ut_metadata": 1,
		},
	})...)
	if err := mw.write(ctx, data); err != nil {
		mw.err = err
		return
	}
}

func (mw *metaWire) onExtHandshake(ctx context.Context, payload []byte) error {
	select {
	case <-ctx.Done():
		return errTimeout
	default:
	}

	dict, err := bencode.Decode(bytes.NewBuffer(payload))
	if err != nil {
		return errExtHeader
	}

	metadataSize, ok := dict["metadata_size"].(int64)
	if !ok {
		return errExtHeader
	}

	if metadataSize > maxMetadataSize {
		return errors.New("metadata_size too long")
	}

	if metadataSize < 0 {
		return errors.New("negative metadata_size")
	}

	m, ok := dict["m"].(map[string]interface{})
	if !ok {
		return errExtHeader
	}

	utMetadata, ok := m["ut_metadata"].(int64)
	if !ok {
		return errExtHeader
	}

	mw.metadataSize = int(metadataSize)
	mw.utMetadata = int(utMetadata)
	mw.numOfPieces = mw.metadataSize / perBlock
	if mw.metadataSize%perBlock != 0 {
		mw.numOfPieces++
	}
	mw.pieces = make([][]byte, mw.numOfPieces)

	for i := 0; i < mw.numOfPieces; i++ {
		mw.requestPiece(ctx, i)
	}

	return nil
}

func (mw *metaWire) requestPiece(ctx context.Context, i int) {
	buf := bytes.NewBuffer(nil)
	buf.WriteByte(byte(extended))
	buf.WriteByte(byte(mw.utMetadata))
	buf.Write(bencode.Encode(map[string]interface{}{
		"msg_type": 0,
		"piece":    i,
	}))
	mw.write(ctx, buf.Bytes())
}

func (mw *metaWire) onExtended(ctx context.Context, ext byte, payload []byte) error {
	if ext == 0 {
		if err := mw.onExtHandshake(ctx, payload); err != nil {
			return err
		}
	} else {
		piece, index, err := mw.onPiece(ctx, payload)
		if err != nil {
			return err
		}
		mw.pieces[index] = piece
	}
	return nil
}

func (mw *metaWire) onPiece(ctx context.Context, payload []byte) ([]byte, int, error) {
	select {
	case <-ctx.Done():
		return nil, -1, errTimeout
	default:
	}

	trailerIndex := bytes.Index(payload, []byte("ee")) + 2
	if trailerIndex == 1 {
		return nil, 0, errInvalidPiece
	}

	dict, err := bencode.Decode(bytes.NewBuffer(payload[:trailerIndex]))
	if err != nil {
		return nil, 0, errInvalidPiece
	}

	pieceIndex, ok := dict["piece"].(int64)
	if !ok || int(pieceIndex) >= mw.numOfPieces {
		return nil, 0, errInvalidPiece
	}

	msgType, ok := dict["msg_type"].(int64)
	if !ok || msgType != 1 {
		return nil, 0, errInvalidPiece
	}

	return payload[trailerIndex:], int(pieceIndex), nil
}

func (mw *metaWire) checkDone() bool {
	for _, b := range mw.pieces {
		if b == nil {
			return false
		}
	}
	return true
}

func (mw *metaWire) preHeader() []byte {
	buf := bytes.NewBuffer(nil)
	buf.WriteByte(19)
	buf.WriteString("BitTorrent protocol")
	buf.Write([]byte{0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x01})
	return buf.Bytes()
}

func (mw *metaWire) next(ctx context.Context) ([]byte, error) {
	data, err := mw.read(ctx, 4)
	if err != nil {
		return nil, err
	}

	size := binary.BigEndian.Uint32(data)
	data, err = mw.read(ctx, size)
	if err != nil {
		return nil, err
	}

	return data, nil
}

func (mw *metaWire) read(ctx context.Context, size uint32) ([]byte, error) {
	select {
	case <-ctx.Done():
		return nil, errTimeout
	default:
	}

	buf := bytes.NewBuffer(nil)
	_, err := io.CopyN(buf, mw.conn, int64(size))
	if err != nil {
		return nil, fmt.Errorf("read %d bytes message failed: %v", size, err)
	}

	return buf.Bytes(), nil
}

func (mw *metaWire) write(ctx context.Context, data []byte) error {
	select {
	case <-ctx.Done():
		return errTimeout
	default:
	}

	buf := bytes.NewBuffer(nil)
	length := int32(len(data))
	binary.Write(buf, binary.BigEndian, length)
	buf.Write(data)
	_, err := mw.conn.Write(buf.Bytes())
	if err != nil {
		return fmt.Errorf("write message failed: %v", err)
	}

	return nil
}

func (mw *metaWire) free() {
	metaWirePool.Put(mw)
}
