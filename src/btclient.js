'use strict';

import net from 'net';
import EventEmitter from 'events';
import LRU from 'lru';
import Wire from './wire';
import utils from './utils';

export default class BTClient extends EventEmitter {
  /**
   * constructor
   * @param  {Object} options [description]
   * @return {[type]}         [description]
   */
  constructor(options = {}){
    super();
    this.timeout = options.timeout || 5000;
    this.lru = LRU({
      max: 100000, 
      maxAge: 1000 * 60 * 10
    });
  }
  /**
   * format meta data
   * @param  {[type]} metadata [description]
   * @return {[type]}          [description]
   */
  formatMetaData(metadata){
    let info = metadata.info;
    let name = (info['utf-8.name'] || info.name);
    if(!name){
      return;
    }
    name = utils.toUtf8String(name);

    let data = {
      name,
      size: info.length
    };
    if(info.private){
      data.private = info.private;
    }
    if(info.files){
      let total = 0;
      data.files = info.files.map(item => {
        item.path = item.path.map(it => {
          return utils.toUtf8String(it);
        }).join('/');
        total += item.length;
        return {
          size: item.length,
          path: item.path
        };
      }).sort((a, b) => {
        return a.size > b.size ? -1 : 1;
      });
      data.size = total;
    }else{
      data.files = [{
        size: data.size,
        path: data.name
      }];
    }

    let extraProperties = ['source', 'profiles', 'private', 'file-duration', 'file-media', 'pieces'];
    extraProperties.forEach(item => {
      if(info[item]){
        data[item] = info[item];
      }
    });
    
    return data;
  }
  /**
   * download
   * @param  {Object} rinfo    [description]
   * @param  {[type]} infohash [description]
   * @return {[type]}          [description]
   */
  download(rinfo = {}, infohash){
    let infoHashHex = infohash.toString('hex');
    if (this.lru.get(infoHashHex) ) {
      return;
    }
    this.lru.set(infoHashHex, true);
    
    let socket = new net.Socket();

    socket.setTimeout(this.timeout);

    socket.connect(rinfo.port, rinfo.address, () => {
      let wire = new Wire(infohash);
      socket.pipe(wire).pipe(socket);
      wire.on('metadata', (metadata, infoHash) => {
        //destroy socket when get metadata
        socket.destroy();

        metadata = this.formatMetaData(metadata);
        if(!metadata){
          return;
        }
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