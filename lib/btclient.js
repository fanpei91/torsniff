'use strict'

var EventEmitter = require('events');
var util = require('util');
var net = require('net');

var Wire = require('./wire');


var BTClient = function(options) {
    EventEmitter.call(this);

    this.timeout = options.timeout;
    this.reqs = [];
    this.filter = options.filter ? options.filter : function(infohash, rinfo, callback) { callback(true); };
    this.maxConnections = options.maxConnections || 200;
    this.activeConnections = 0;
    this.maxItemsInQueue = options.maxItemsInQueue || (this.maxConnections * 10);
    this.requestInterval = options.requestInterval || 200;
    this.on('download', this._download);

    this._next();
};

util.inherits(BTClient, EventEmitter);

BTClient.prototype._next = function() {
    if (this.activeConnections < this.maxConnections) {
        var req = this.reqs.shift();
        if (req) {
            this.filter(req.infohash.toString('hex'), req.rinfo, function(drop) {
                if (!drop) {
                    this.emit('download', req.rinfo, req.infohash);
                }
            }.bind(this));
        }
    }
    setTimeout(function() {
        this._next();
    }.bind(this), this.requestInterval);
};

BTClient.prototype._download = function(rinfo, infohash) {
    var socket = new net.Socket();
    this.activeConnections++;
    socket.setTimeout(this.timeout || 5000);
    socket.connect(rinfo.port, rinfo.address, function() {
        var wire = new Wire(infohash);
        socket.pipe(wire).pipe(socket);

        wire.on('metadata', function(metadata, infoHash) {
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
        socket.destroy();
        this.activeConnections--;
    }.bind(this));
};

BTClient.prototype.push = function(rinfo, infohash) {
    if (this.reqs.length >= this.maxItemsInQueue) {
        return;
    }
    this.reqs.push({ infohash: infohash, rinfo: rinfo });
};

BTClient.prototype.isIdle = function() {
    return this.reqs.length == 0;
};

module.exports = BTClient;
