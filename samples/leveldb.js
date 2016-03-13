'use strict';

/**
 * Sample of using leveldb to store fetched p2p data.
 * Need to install leveld first:
 *  1. npm install level
 *  2. node samples/leveldb.js
 */

var P2PSpider = require('../lib');
var level = require('level');

var db = level('./leveldb');

var p2p = P2PSpider({
    nodesMaxSize: 200,
    maxConnections: 400,
    timeout: 5000
});

p2p.ignore(function (infohash, rinfo, callback) {
    db.get(infohash, function (err, value) {
        callback(!!err);
    });
});

p2p.on('metadata', function (metadata) {
    var data = {};
    data.magnet = metadata.magnet;
    data.name = metadata.info.name ? metadata.info.name.toString() : '';
    data.fetchedAt = new Date().getTime();
    db.put(metadata.infohash, JSON.stringify(data), function (err) {
        if(!err) {
            console.log(data.name);
        }
    });
});

process.on('SIGINT', function() {
    db.close(function(err) {
        console.log("DB closed!");
        process.exit();
    });
});

p2p.listen(6881, '0.0.0.0');
