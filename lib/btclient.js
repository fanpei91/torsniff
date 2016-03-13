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

    for (var i = 0; i < this.maxConnections; i++) {
        this._next();
    }
};

util.inherits(BTClient, EventEmitter);

BTClient.prototype._next = function(infohash, successful) {
    var req = this.peers.get(infohash, successful);
    if (req) {
        this.ignore(req.infohash.toString('hex'), req.rinfo, function(drop) {
            if (!drop) {
                this.emit('download', req.rinfo, req.infohash);
            }
        }.bind(this));
    }
    else {
        setTimeout(this._next.bind(this), 1000, infohash, successful);
    }
    setTimeout(function() {
        this._next();
    }.bind(this), this.requestInterval);
};

BTClient.prototype._download = function(rinfo, infohash) {
    var socket = new net.Socket();
    var successful = false;

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
        this._next(infohash, successful);
    }.bind(this));
};

BTClient.prototype.push = function(rinfo, infohash) {
    this.peers.add({infohash: infohash, rinfo: rinfo});
};

BTClient.prototype.isIdle = function() {
    return this.peers.length() === 0;
};

module.exports = BTClient;
