'use strict';

// This is an example of using p2pspider, you can change the code to make it do something else.
var fs = require('fs');
var path = require('path');

var bencode = require('bencode');
var P2PSpider = require('./lib');

var p2p = P2PSpider({
    nodesMaxSize: 400,
    maxConnections: 800,
    timeout: 10000
});

var sqlite3 = require('sqlite3').verbose();
var dbFile = path.join(__dirname, "peers.sqlite3");
var db;

// Create the tables if the file doesn't exist
fs.access(dbFile, fs.F_OK, function(err) {
    db = new sqlite3.Database(dbFile);
    if (err) {
        db.serialize(function() {
            db.run("create table peers (infohash varchar(40), peer varchar(40))");
            db.run("create unique index peer_unique on peers(infohash, peer)");
        });
    }
});

p2p.ignore(function (infohash, rinfo, callback) {
    var torrentFilePathSaveTo = path.join(__dirname, "torrents", infohash + ".torrent");

    console.log('Saving peer for ' + infohash);
    db.serialize(function() {
        db.run("insert into peers (infohash, peer) values ('" + infohash + "','"  + rinfo.address + "')", function(err) {
            if (err) {
                console.error(err);
            }
        });
    });

    fs.exists(torrentFilePathSaveTo, function(exists) {
        callback(exists); //if is not exists, download the metadata.
    });
});

p2p.on('metadata', function (metadata) {
    var torrentFilePathSaveTo = path.join(__dirname, "torrents", metadata.infohash + ".torrent");
    fs.writeFile(torrentFilePathSaveTo, bencode.encode({'info': metadata.info}), function(err) {
        if (err) {
            return console.error(err);
        }
        console.log(metadata.infohash + ".torrent has saved.");
    });
});

p2p.listen(6881, '0.0.0.0');
