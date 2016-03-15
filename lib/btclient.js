'use strict'

var EventEmitter = require('events');
var util = require('util');
var net = require('net');

var PeerQueue = require('./peer-queue');
var Wire = require('./wire');


var BTClient = function(options) {
    EventEmitter.call(this);

    this.timeout = options.timeout;
    this.maxConnections = options.maxConnections || 200;
    this.activeConnections = 0;
    this.peers = new PeerQueue(this.maxConnections);
    this.on('download', this._download);

    if (typeof options.ignore === 'function') {
        this.ignore = options.ignore;
    }
    else {
        this.ignore = function (infohash, rinfo, ignore) {
            ignore(false);
        };
    }
};

util.inherits(BTClient, EventEmitter);

BTClient.prototype._next = function(infohash, successful) {
    var req = this.peers.shift(infohash, successful);
    if (req) {
        this.ignore(req.infohash.toString('hex'), req.rinfo, function(drop) {
            if (!drop) {
                this.emit('download', req.rinfo, req.infohash);
            }
        }.bind(this));
    }
};

BTClient.prototype._download = function(rinfo, infohash) {
    this.activeConnections++;

    var successful = false;
    var socket = new net.Socket();

    socket.setTimeout(this.timeout || 5000);
    socket.connect(rinfo.port, rinfo.address, function() {
        var wire = new Wire(infohash);
        socket.pipe(wire).pipe(socket);

        wire.on('metadata', function(metadata, infoHash) {
            successful = true;
            this.emit('complete', metadata, infoHash, rinfo);
            socket.destroy();
        }.bind(this));

        wire.on('fail', function() {
            socket.destroy();
        }.bind(this));

        wire.sendHandshake();
    }.bind(this));

    socket.on('error', function(err) {
        socket.destroy();
    }.bind(this));

    socket.on('timeout', function(err) {
        socket.destroy();
    }.bind(this));

    socket.once('close', function() {
        this.activeConnections--;
        this._next(infohash, successful);
    }.bind(this));
};

BTClient.prototype.add = function(rinfo, infohash) {
    this.peers.push({infohash: infohash, rinfo: rinfo});
    if (this.activeConnections < this.maxConnections && this.peers.length() > 0) {
        this._next();
    }
};

BTClient.prototype.isIdle = function() {
    return this.peers.length() === 0;
};

module.exports = BTClient;