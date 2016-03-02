'use strict'

var EventEmitter = require('events');
var util = require('util');
var net = require('net');

var LRU = require('lru');

var Wire = require('./wire');

var lru = LRU({  max: 100000, maxAge: 1000 * 60 * 10});


var BTClient = function(options) {
    EventEmitter.call(this);
    
    this.timeout = options.timeout;
};

util.inherits(BTClient, EventEmitter);

BTClient.prototype.download = function(rinfo, infohash) {
    if ( lru.get(infohash) ) {
        return;
    }
    lru.set(infohash, true);
    
    var socket = new net.Socket();
    socket.setTimeout(this.timeout || 5000);
    socket.connect(rinfo.port, rinfo.address, function() {
        var wire = new Wire(infohash);
        socket.pipe(wire).pipe(socket);
        wire.on('metadata', function(metadata, infoHash) {
            this.emit('complete', metadata, infoHash, rinfo);
        }.bind(this));
        wire.sendHandshake();
    }.bind(this));
    
    socket.on('error', function(err) {
        socket.destroy();
    }.bind(this));
    
    socket.on('timeout', function(err) {
        socket.destroy();
    }.bind(this));
};

module.exports = BTClient;