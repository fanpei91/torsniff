'use strict'

var dgram = require('dgram');

var bencode = require('bencode');

var utils = require('./utils');
var KTable = require('./ktable');

var BOOTSTRAP_NODES = [
    ['router.bittorrent.com', 6881],
    ['dht.transmissionbt.com', 6881]
];
var TID_LENGTH = 4;
var NODES_MAX_SIZE = 200;
var TOKEN_LENGTH = 2;

var DHTSpider = function(options) {
    this.btclient = options.btclient;
    this.address = options.address;
    this.port = options.port;
    this.udp = dgram.createSocket('udp4');
    this.ktable = new KTable(options.nodesMaxSize || NODES_MAX_SIZE);
}

DHTSpider.prototype.sendKRPC = function(msg, rinfo) {
    try {
        var buf = bencode.encode(msg);
    }
    catch (err) {
        return;
    }
    this.udp.send(buf, 0, buf.length, rinfo.port, rinfo.address);
};

DHTSpider.prototype.onFindNodeResponse = function(nodes) {
    var nodes = utils.decodeNodes(nodes);
    nodes.forEach(function(node) {
        if (node.address != this.address && node.nid != this.ktable.nid
                && node.port < 65536 && node.port > 0) {
            this.ktable.push(node);
        }
    }.bind(this));
};

DHTSpider.prototype.sendFindNodeRequest = function(rinfo, nid) {
    var _nid = nid != undefined ? utils.genNeighborID(nid, this.ktable.nid) : this.ktable.nid;
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
    BOOTSTRAP_NODES.forEach(function(node) {
        this.sendFindNodeRequest({address: node[0], port: node[1]});
    }.bind(this));
};

DHTSpider.prototype.makeNeighbours = function() {
    this.ktable.nodes.forEach(function(node) {
        this.sendFindNodeRequest({
            address: node.address,
            port: node.port
        }, node.nid);
    }.bind(this));
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
            id: utils.genNeighborID(infohash, this.ktable.nid),
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
            id: utils.genNeighborID(nid, this.ktable.nid)
        }
    }, rinfo);

    this.btclient.add({address: rinfo.address, port: port}, infohash);
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

    this.udp.on('listening', function() {
        console.log('UDP Server listening on %s:%s', this.address, this.port);
    }.bind(this));

    this.udp.on('message', function(msg, rinfo) {
        this.onMessage(msg, rinfo);
    }.bind(this));

    this.udp.on('error', function() {
        // do nothing
    }.bind(this));

    setInterval(function() {
        if (this.btclient.isIdle()) {
            this.joinDHTNetwork();
            this.makeNeighbours();
        }
    }.bind(this), 1000);
};

exports.start = function(options) {
    (new DHTSpider(options)).start();
};
