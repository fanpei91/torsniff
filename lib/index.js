'use strict';

var DHTSpider = require('./dhtspider');
var BTClient = require('./btclient');

module.exports = function(options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    
    var btclient = new BTClient({
        timeout: options.timeout || 1000 * 10,
        filter: options.filter,
        maxConnections: options.maxConnections
    });
    
    btclient.on('complete', function(metadata, infohash, rinfo) {
        var _metadata = metadata;
        _metadata.address = rinfo.address;
        _metadata.port = rinfo.port;
        _metadata.infohash = infohash.toString('hex');
        _metadata.magnet = 'magnet:?xt=urn:btih:' + _metadata.infohash;

        if (callback) {
            callback(_metadata);
        }
        else {
            console.log(_metadata.name, _metadata.magnet);
        }
    }.bind(this));

    DHTSpider.start({
        btclient: btclient,
        address: options.address,
        port: options.port || 6219,
        nodesMaxSize: options.nodesMaxSize || 4000
    });
};