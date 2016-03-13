'use strict';

var EventEmitter = require('events');
var util = require('util');

var DHTSpider = require('./dhtspider');
var BTClient = require('./btclient');

var P2PSpider = function (options) {
    if (!(this instanceof P2PSpider)) {
        return new P2PSpider(options);
    }
    EventEmitter.call(this);
    this.options = options || {};
    this._ignore = undefined;
};

util.inherits(P2PSpider, EventEmitter);


P2PSpider.prototype.ignore = function (ignore) {
    this._ignore = ignore;
};

P2PSpider.prototype.listen = function (port, address) {
    this.port = port || 6881;
    this.address = address || '0.0.0.0';

    var btclient = new BTClient({
        timeout: this.options.timeout || 1000 * 10,
        ignore: this._ignore,
        maxConnections: this.options.maxConnections
    });

    btclient.on('complete', function(metadata, infohash, rinfo) {
        var _metadata = metadata;
        _metadata.address = rinfo.address;
        _metadata.port = rinfo.port;
        _metadata.infohash = infohash.toString('hex');
        _metadata.magnet = 'magnet:?xt=urn:btih:' + _metadata.infohash;
        this.emit('metadata', _metadata);
    }.bind(this));

    DHTSpider.start({
        btclient: btclient,
        address: this.address,
        port: this.port,
        nodesMaxSize: this.options.nodesMaxSize || 4000
    });
};

module.exports = P2PSpider;