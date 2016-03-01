'use strict';

import net from 'net';
import EventEmitter from 'events';
import LRU from 'lru';
import Wire from './wire';

const lru = LRU({
  max: 100000, 
  maxAge: 1000 * 60 * 10
});

export default class BTClient extends EventEmitter {
  /**
   * constructor
   * @param  {Object} options [description]
   * @return {[type]}         [description]
   */
  constructor(options = {}){
    super();
    this.timeout = options.timeout || 5000;
  }
  /**
   * download
   * @param  {Object} rinfo    [description]
   * @param  {[type]} infohash [description]
   * @return {[type]}          [description]
   */
  download(rinfo = {}, infohash){
    if (lru.get(infohash) ) {
      return;
    }
    lru.set(infohash, true);
    
    let socket = new net.Socket();
    socket.setTimeout(this.timeout);
    socket.connect(rinfo.port, rinfo.address, () => {
      let wire = new Wire(infohash);
      socket.pipe(wire).pipe(socket);
      wire.on('metadata', (metadata, infoHash) => {
        this.emit('complete', metadata, infoHash, rinfo);
      });
      wire.sendHandshake();
    });
    
    socket.on('error', () => {
      socket.destroy();
    });
    
    socket.on('timeout', () => {
      socket.destroy();
    });
  }
}