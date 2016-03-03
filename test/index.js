'use strict';

var p2pspider = require('../lib/index');

p2pspider(
    {
        address: '0.0.0.0',
        port: 6881,
        nodesMaxSize: 200,   // be careful
        maxConnections: 400, // be careful
        timeout: 5000,
        filter: function(infohash, callback) {
            var theInfohashIsExistsInDatabase = false;
            callback(theInfohashIsExistsInDatabase);
        }
    },
    function(metadata) {
        console.log(metadata);
    }
);