'use strict';


import stream from 'stream';
import crypto from 'crypto';

import BitField from 'bitfield';
import bencode from 'bencode';


import utils from './utils';

const BT_RESERVED = new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x01]);
const BT_PROTOCOL = new Buffer('BitTorrent protocol');
const PIECE_LENGTH = Math.pow(2, 14);
const MAX_METADATA_SIZE = 10000000;
const EXT_HANDSHAKE_ID = 0;
const BITFIELD_GROW = 1000;
const BT_MSG_ID = 20;

export default class Wire extends stream.Duplex {
  /**
   * constructor
   * @param  {[type]} infohash [description]
   * @return {[type]}          [description]
   */
  constructor(infohash){
    super();
    
    this._bitfield = new BitField(0, { 
      grow: BITFIELD_GROW 
    });
    this._infohash = infohash;
    
    this._buffer = [];
    this._bufferSize = 0;
    
    this._next = null;
    this._nextSize = 0;
    
    this._metadata = null;
    this._metadataSize = null;
    this._numPieces = 0;
    this._ut_metadata = null;
    
    this._onHandshake();
  }

  _onMessageLength(buffer){
    let length = buffer.readUInt32BE(0);
    if (length > 0) {
      this._register(length, this._onMessage);
    }
  }

  _onMessage(buffer){
    this._register(4, buffer => this._onMessageLength(buffer));
    if (buffer[0] === BT_MSG_ID) {
      this._onExtended(buffer.readUInt8(1), buffer.slice(2));
    }
  }

  _onExtended(ext, buf){
    if (ext === 0) {
      try{
        this._onExtHandshake(bencode.decode(buf));
      }catch(e){}
    }else {
      this._onPiece(buf);
    }
  }

  _register(size, next){
    this._nextSize = size;
    this._next = next;
  }

  _onHandshake(){
    this._register(1, buffer => {
      let pstrlen = buffer.readUInt8(0);
      this._register(pstrlen + 48, handshake => {
        let protocol = handshake.slice(0, pstrlen);
        if (protocol.toString() !== BT_PROTOCOL.toString()) {
          this.end();
          return;
        }
        handshake = handshake.slice(pstrlen);
        if (handshake[5] & 0x10) {
          this._sendExtHandshake();
        }
        this._register(4, buffer => this._onMessageLength(buffer));
      });
    });
  }

  _onExtHandshake(extHandshake){
    if (!extHandshake.metadata_size || !extHandshake.m.ut_metadata
        || extHandshake.metadata_size > MAX_METADATA_SIZE) {
      return;
    }

    this._metadataSize = extHandshake.metadata_size;
    this._numPieces = Math.ceil(this._metadataSize / PIECE_LENGTH);
    this._ut_metadata = extHandshake.m.ut_metadata;
    
    this._requestPieces();
  }

  _requestPieces(){
    this._metadata = new Buffer(this._metadataSize);
    for (let piece = 0; piece < this._numPieces; piece++) {
      this._requestPiece(piece);
    }
  }

  _requestPiece(piece){
    let msg = Buffer.concat([
      new Buffer([BT_MSG_ID]),
      new Buffer([this._ut_metadata]),
      bencode.encode({msg_type: 0, piece: piece})
    ]);
    this._sendMessage(msg);
  }

  _sendPacket(packet){
    this.push(packet);
  }

  _sendMessage(msg){
    let buf = new Buffer(4);
    buf.writeUInt32BE(msg.length, 0);
    this._sendPacket(Buffer.concat([buf, msg]));
  }

  sendHandshake(){
    let peerID = utils.randomID();
    let packet = Buffer.concat([
      new Buffer([BT_PROTOCOL.length]),
      BT_PROTOCOL, 
      BT_RESERVED, 
      this._infohash, 
      peerID
    ]);
    this._sendPacket(packet);
  }

  _sendExtHandshake(){
    let msg = Buffer.concat([
      new Buffer([BT_MSG_ID]),
      new Buffer([EXT_HANDSHAKE_ID]),
      bencode.encode({m: {ut_metadata: 1}})
    ]);
    this._sendMessage(msg);
  }

  _onPiece(piece){
    let dict, trailer;
    try {
      let str = piece.toString();
      let trailerIndex = str.indexOf('ee') + 2;
      dict = bencode.decode(str.substring(0, trailerIndex));
      trailer = piece.slice(trailerIndex);
    }
    catch (err) {
      return;
    }
    if (dict.msg_type !== 1) {
      return;
    }
    if (trailer.length > PIECE_LENGTH) {
      return;
    }
    trailer.copy(this._metadata, dict.piece * PIECE_LENGTH);
    this._bitfield.set(dict.piece);
    this._checkDone();
  }

  _checkDone(){
    let done = true;
    for (let piece = 0; piece < this._numPieces; piece++) {
      if (!this._bitfield.get(piece) ) {
        done = false;
        break;
      }
    }
    if (!done) { 
      return;
    }
    this._onDone(this._metadata);
  }

  _onDone(metadata){
    try {
      let info = bencode.decode(metadata).info;
      if (info) {
        metadata = bencode.encode(info);
      }
    }
    catch (err) {
      return;
    }
    let infohash = crypto.createHash('sha1').update(metadata).digest('hex');
    if (this._infohash.toString('hex') !== infohash ) {
      return false;
    }
    this.emit('metadata', {info: bencode.decode(metadata)}, this._infohash);
  }

  _write(buf, encoding, next){
    this._bufferSize += buf.length;
    this._buffer.push(buf);
    
    while (this._bufferSize >= this._nextSize) {
      let buffer = Buffer.concat(this._buffer);
      this._bufferSize -= this._nextSize;
      this._buffer = this._bufferSize ? [buffer.slice(this._nextSize)] : [];
      this._next(buffer.slice(0, this._nextSize));
    }
    
    next(null);
  }

  _read(){
    
  }
}