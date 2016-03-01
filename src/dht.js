'use strict';

import dgram from 'dgram';
import bencode from 'bencode';
import utils from './utils';
import KTable from './ktable';

const BOOTSTRAP_NODES = [
  ['router.bittorrent.com', 6881],
  ['dht.transmissionbt.com', 6881]
];

const TID_LENGTH = 4;
const NODES_MAX_SIZE = 1000;
const TOKEN_LENGTH = 2;


export default class DHTSpider {
  /**
   * [constructor description]
   * @param  {Object} options [description]
   * @return {[type]}         [description]
   */
  constructor(options = {}){
    this.btclient = options.btclient;
    this.address = options.address;
    this.port = options.port;
    this.udp = dgram.createSocket('udp4');
    this.ktable = new KTable(options.nodesMaxSize || NODES_MAX_SIZE);
    this.bootstrapNodes = options.bootstrapNodes || BOOTSTRAP_NODES;
  }

  sendKRPC(msg, rinfo = {}){
    if (rinfo.port >= 65536 || rinfo.port <= 0) {
      return;
    }
    let buf = bencode.encode(msg);
    this.udp.send(buf, 0, buf.length, rinfo.port, rinfo.address);
  }

  onFindNodeResponse(nodes){
    nodes = utils.decodeNodes(nodes);
    nodes.forEach(node => {
      if (node.address !== this.address && node.nid !== this.ktable.nid
        && node.port < 65536 && node.port > 0) {
        this.ktable.push(node);
      }
    });
  }

  sendFindNodeRequest(rinfo, nid){
    let _nid = nid !== undefined ? utils.genNeighborID(nid, this.ktable.nid) : this.ktable.nid;
    let msg = {
      t: utils.randomID().slice(0, TID_LENGTH),
      y: 'q',
      q: 'find_node',
      a: {
        id: _nid,
        target: utils.randomID()
      }
    };
    this.sendKRPC(msg, rinfo);
  }

  joinDHTNetwork(){
    this.bootstrapNodes.forEach(node => {
      this.sendFindNodeRequest({
        address: node[0], 
        port: node[1]
      });
    });
  }

  makeNeighbours(){
    this.ktable.nodes.forEach(node => {
      this.sendFindNodeRequest({
        address: node.address,
        port: node.port
      }, node.nid);
    });
    this.ktable.nodes = [];
  }

  onGetPeersRequest(msg, rinfo){
    let infohash = msg.a.info_hash;
    let tid = msg.t;
    let nid = msg.a.id;
    let token = infohash.slice(0, TOKEN_LENGTH);

    if (tid === undefined || infohash.length !== 20 || nid.length !== 20) {
      return;
    }

    this.sendKRPC({
      t: tid,
      y: 'r',
      r: {
        id: utils.genNeighborID(infohash, this.ktable.nid),
        nodes: '',
        token: token
      }
    }, rinfo);
  }

  onAnnouncePeerRequest(msg, rinfo){
    let port;
    
    let infohash = msg.a.info_hash;
    let token = msg.a.token;
    let nid = msg.a.id;
    let tid = msg.t;
    
    if (tid === undefined) {
      return;
    }
    
    if (infohash.slice(0, TOKEN_LENGTH).toString() !== token.toString()) {
      return;
    }
    
    if (msg.a.implied_port !== undefined && msg.a.implied_port !== 0) {
      port = rinfo.port;
    }else {
      port = msg.a.port || 0;
    }
    
    if (port >= 65536 || port <= 0) {
      return;
    }
    
    this.sendKRPC({
      t: tid,
      y: 'r',
      r: {
        id: utils.genNeighborID(nid, this.ktable.nid)
      }
    }, rinfo);
    
    this.btclient.download({
      address: rinfo.address, 
      port: port
    }, infohash);
  }

  onMessage(msg, rinfo){
    try{
      msg = bencode.decode(msg);
    }catch(e){
      return;
    }
    let y = msg.y && msg.y.toString();
    let q = msg.q && msg.q.toString();
    if (y === 'r' && msg.r.nodes) {
      this.onFindNodeResponse(msg.r.nodes);
    }else if (y === 'q' && q === 'get_peers') {
      this.onGetPeersRequest(msg, rinfo);
    }else if (y === 'q' && q === 'announce_peer') {
      this.onAnnouncePeerRequest(msg, rinfo);
    }
  }

  start(){
    this.udp.bind(this.port, this.address);

    this.udp.on('listening', () => {
      console.log('udp start listening:', this.address, this.port);
    });

    this.udp.on('message', (msg, rinfo) => {
      this.onMessage(msg, rinfo);
    });

    this.udp.on('error', err => {
      console.log('error', err.stack);
    });

    setInterval(() => this.joinDHTNetwork(), 1000);
    setInterval(() => this.makeNeighbours(), 1000);
  }
  
  static start(options){
    let instance = new DHTSpider(options);
    instance.start();
  }
}