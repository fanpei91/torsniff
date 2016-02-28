'use strict'

const dgram = require('dgram');

const bencode = require('bencode');

const utils = require('./utils');

const BOOTSTRAP_NODES = [
    ['router.bittorrent.com', 6881],
    ['dht.transmissionbt.com', 6881]
];
const TID_LENGTH = 4;
const NODES_MAX_SIZE = 1000;
const TOKEN_LENGTH = 2;

function decodeNodes(data) {
  var nodes = [];
  for (var i = 0; i + 26 <= data.length; i += 26) {
    nodes.push({
      nid: data.slice(i, i + 20),
      address: data[i + 20] + '.' + data[i + 21] + '.' +
               data[i + 22] + '.' + data[i + 23],
      port: data.readUInt16BE(i + 24)
    });
  }
  return nodes;
};

function genNeighborID(target, nid) {
    return  Buffer.concat([target.slice(0, 10), nid.slice(10)]);
}

const KTable = function(maxsize) {
    this.nid = utils.randomID();
    this.nodes = [];
    this.maxsize = maxsize;
}

KTable.prototype.push = function(node) {
    if (this.nodes.length >= this.maxsize) {
        return;
    }
    this.nodes.push(node);
};

const DHTSpider = function(options) {
    this.btclient = options.btclient;
    this.address = options.address;
    this.port = options.port;
    this.udp = dgram.createSocket('udp4');
    this.ktable = new KTable(options.nodesMaxSize || NODES_MAX_SIZE);
}

DHTSpider.prototype.sendKRPC = function(msg, rinfo) {
    var buf = bencode.encode(msg);
    this.udp.send(buf, 0, buf.length, rinfo.port, rinfo.address);
};

DHTSpider.prototype.onFindNodeResponse = function(nodes) {
    var nodes = decodeNodes(nodes);
    nodes.forEach((node) => {
        if (node.address != this.address && node.nid != this.ktable.nid
                && node.port < 65536 && node.port > 0) {
            this.ktable.push(node);
        }
    });
};

DHTSpider.prototype.sendFindNodeRequest = function(rinfo, nid) {
    var _nid = nid != undefined ? genNeighborID(nid, this.ktable.nid) : this.ktable.nid;
    var msg = {
        t: utils.randomID().slice(0, TID_LENGTH),
        y: 'q',
        q: 'find_node',
        a: {
            id: _nid,
            target: utils.randomID()
        }
    };
    this.sendKRPC(msg, rinfo);
};

DHTSpider.prototype.joinDHTNetwork = function() {
    BOOTSTRAP_NODES.forEach((node) => {
        this.sendFindNodeRequest({address: node[0], port: node[1]});
    });
};

DHTSpider.prototype.makeNeighbours = function() {
    this.ktable.nodes.forEach((node) => {
        this.sendFindNodeRequest({
            address: node.address,
            port: node.port
        }, node.nid);
    });
    this.ktable.nodes = [];
};

DHTSpider.prototype.onGetPeersRequest = function(msg, rinfo) {
    try {
        var infohash = msg.a.info_hash;
        var tid = msg.t;
        var nid = msg.a.id;
        var token = infohash.slice(0, TOKEN_LENGTH);

        if (tid === undefined || infohash.length != 20 || nid.length != 20) {
            throw new Error;
        }
    }
    catch (err) {
        return;
    }
    this.sendKRPC({
        t: tid,
        y: 'r',
        r: {
            id: genNeighborID(infohash, this.ktable.nid),
            nodes: '',
            token: token
        }
    }, rinfo);
};

DHTSpider.prototype.onAnnouncePeerRequest = function(msg, rinfo) {
    var port;
    
    try {
        var infohash = msg.a.info_hash;
        var token = msg.a.token;
        var nid = msg.a.id;
        var tid = msg.t;
        
        if (tid == undefined) {
            throw new Error;
        }
    }
    catch (err) {
        return;
    }
    
    if (infohash.slice(0, TOKEN_LENGTH).toString() != token.toString()) {
        return;
    }
    
    if (msg.a.implied_port != undefined && msg.a.implied_port != 0) {
        port = rinfo.port;
    }
    else {
        port = msg.a.port || 0;
    }
    
    if (port >= 65536 || port <= 0) {
        return;
    }
    
    this.sendKRPC({
        t: tid,
        y: 'r',
        r: {
            id: genNeighborID(nid, this.ktable.nid)
        }
    }, rinfo);
    
    this.btclient.download({address: rinfo.address, port: port}, infohash);
};

DHTSpider.prototype.onMessage = function(msg, rinfo) {
    try {
        var msg = bencode.decode(msg);
        if (msg.y == 'r' && msg.r.nodes) {
            this.onFindNodeResponse(msg.r.nodes);
        }
        else if (msg.y == 'q' && msg.q == 'get_peers') {
            this.onGetPeersRequest(msg, rinfo);
        }
        else if (msg.y == 'q' && msg.q == 'announce_peer') {
            this.onAnnouncePeerRequest(msg, rinfo);
        }
    }
    catch (err) {
    }
};

DHTSpider.prototype.start = function() {
    this.udp.bind(this.port, this.address);
    this.udp.on('message', (msg, rinfo) => {
        this.onMessage(msg, rinfo);
    });
    this.udp.on('error', (err) => {});
    setInterval(() => {this.joinDHTNetwork()}, 1000);
    setInterval(() => {this.makeNeighbours()}, 1000);
};

exports.start = function(options) {
    (new DHTSpider(options)).start();
};