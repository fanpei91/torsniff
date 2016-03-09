'use strict';

var P2PSpider = require('./lib');
var elasticsearch = require('elasticsearch');

var client = new elasticsearch.Client({'host': 'localhost:9200'});

var p2p = P2PSpider({
    nodesMaxSize: 200,
    maxConnections: 400,
    timeout: 5000
});

p2p.ignore(function (infohash, rinfo, callback) {
    client.exists({ index: 'bt', type: 'json', id: infohash }, function (error, exists) { console.log(infohash + " : " + exists); callback(exists); });
});

p2p.on('metadata', function (metadata) {
    var data = {};
    data.magnet = metadata.magnet;
    data.name = metadata.info.name ? metadata.info.name.toString() : '';
    data.fetchedAt = new Date().getTime();
    client.create({ index: 'bt', type: 'json', id: metadata.infohash, body: data }, function (error, resp) {  });
    console.log(data.name);
});

p2p.listen(6881, '0.0.0.0');
