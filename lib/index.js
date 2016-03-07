'use strict';

var DHTSpider = require('./dhtspider');
var BTClient = require('./btclient');

module.exports = function(options) {

    var btclient = new BTClient({
        timeout: options.timeout || 1000 * 10,
        filter: options.filter,
        maxConnections: options.maxConnections
    });
    return new DHTSpider({
        btclient: btclient,
        address: options.address,
        port: options.port || 6219,
        nodesMaxSize: options.nodesMaxSize || 4000
    });
};