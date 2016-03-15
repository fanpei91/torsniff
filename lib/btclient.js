'use strict'

var EventEmitter = require('events');
var util = require('util');
var net = require('net');

var PeerQueue = require('./peer-queue');
var Wire = require('./wire');


var BTClient = function(options) {
    EventEmitter.call(this);

    this.timeout = options.timeout || 5000;
    this.maxConnections = options.maxConnections || 200;
    this.peers = new PeerQueue(this.maxConnections * 10, 20, this.timeout);
    this.on('download', this._download);
    this.activeConnections = 0;

    if (typeof options.ignore === 'function') {
        this.ignore = options.ignore;
    } else {
        this.ignore = function(infohash, rinfo, ignore) {
            ignore(false);
        };
    }

    setInterval(function() {
        if (this.activeConnections < this.maxConnections) {
            this._next();
        }
    }.bind(this), 50);
};

util.inherits(BTClient, EventEmitter);

BTClient.prototype._next = function() {
    var req = this.peers.pop();
    if (req) {
        this.ignore(req.infohash.toString('hex'), req.rinfo, function(drop) {
            if (!drop) {
                this.emit('download', req.rinfo, req.infohash);
            }
        }.bind(this));
    }
};

BTClient.prototype._download = function(rinfo, infohash) {
    var socket = new net.Socket();
    this.activeConnections++;

    socket.setTimeout(this.timeout);
    socket.connect(rinfo.port, rinfo.address, function() {
        var wire = new Wire(infohash);
        socket.pipe(wire).pipe(socket);

        wire.on('metadata', function(metadata, infoHash) {
            this.peers.remove(infoHash);
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
        this._next();
    }.bind(this));
};

BTClient.prototype.push = function(rinfo, infohash) {
    this.peers.push({ infohash: infohash, rinfo: rinfo });
};

BTClient.prototype.isIdle = function() {
    return this.peers.length() === 0;
};

module.exports = BTClient;
