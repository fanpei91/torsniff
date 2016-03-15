'use strict';

/**
 * Sample of using elastic search to store and index fetched p2p data.
 * Usage:
 *  1. npm install elasticsearch
 *  2. docker run --name elasticsearch -d -p 9200:9200 -p 9300:9300 elasticsearch
 *  3. node samples/elasticsearch.js
 *
 * The ElasticUI can be used as a simple frontend UI.
 */

var P2PSpider = require('../lib');
var elasticsearch = require('elasticsearch');

var client = new elasticsearch.Client({ host: 'localhost:9200' });

var p2p = P2PSpider({
    nodesMaxSize: 200,
    maxConnections: 100,
    timeout: 5000
});

p2p.ignore(function(infohash, rinfo, callback) {
    client.exists({ index: 'seeds', type: 'meta', id: infohash }, function(error, exists) {
        callback(exists);
    });
});

p2p.on('metadata', function(metadata) {
    var data = {};
    data.magnet = metadata.magnet;
    data.name = metadata.info.name ? metadata.info.name.toString() : '';
    data.fetchedAt = new Date().getTime();
    client.index({ index: 'seeds', type: 'meta', id: metadata.infohash, body: data }, function(error, resp) {
        if (!error) {
            console.log(data.name);
        }
    });
});

p2p.listen(6881, '0.0.0.0');
