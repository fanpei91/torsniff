'use strict'

var EventEmitter = require('events');
var util = require('util');
var net = require('net');

var Wire = require('./wire');


var BTClient = function(options) {
    EventEmitter.call(this);
    
    this.timeout = options.timeout;
    this.reqs = [];
    this.filter = options.filter;
    this.maxConnections = options.maxConnections || 1000;
    this.used = 0;
    this.on('download', this._download);
};

util.inherits(BTClient, EventEmitter);

BTClient.prototype.next = function() {
    this.used -= 1;
    if (this.reqs.length == 0) {
        return;
    }
    this.used += 1;
    var req = this.reqs.shift();
    this.emit('download', req.rinfo, req.infohash);
};

BTClient.prototype._download = function(rinfo, infohash) {
    var _infohash = infohash.toString('hex');
    
    var socket = new net.Socket();
    socket.setTimeout(this.timeout || 5000);
    socket.connect(rinfo.port, rinfo.address, function() {
        var wire = new Wire(infohash);
        socket.pipe(wire).pipe(socket);
    
        wire.on('metadata', function(metadata, infoHash) {
            socket.destroy();
            this.emit('complete', metadata, infoHash, rinfo);
            this.next();
        }.bind(this));
    
        wire.on('fail', function() {
            socket.destroy();
            this.next();
        }.bind(this));
    
        wire.sendHandshake();
    }.bind(this));
    
    socket.on('error', function(err) {
        socket.destroy();
        this.next();
    }.bind(this));
    
    socket.on('timeout', function(err) {
        socket.destroy();
        this.next();
    }.bind(this));
};

BTClient.prototype._fetch = function(rinfo, infohash) {
    this.used += 1;
    this.emit('download', rinfo, infohash);
};

BTClient.prototype.push = function(rinfo, infohash) {
    var _infohash = infohash.toString('hex');
    
    if (this.used >= this.maxConnections) {
        if (this.reqs.length <= this.maxConnections) {
            this.reqs.push({ infohash: infohash, rinfo: rinfo });
        }
    }
    else {
        if (typeof this.filter === 'function') {
            this.filter(_infohash, function(drop) {
                if (!drop) {
                    this._fetch(rinfo, infohash);
                }
            }.bind(this));
        }
        else {
            this._fetch(rinfo, infohash);
        }
    }
};

module.exports = BTClient;