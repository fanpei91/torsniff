'use strict';

var p2pspider = require('../lib/index');

p2pspider(
    {
        address: '0.0.0.0',
        port: 6881,
        nodesMaxSize: 4000,
        timeout: 5000
    },
    
    // You can store what you want into database, file or remote service.
    function(metadata) {
        //console.log((metadata.info.name || metadata.info['name.utf-8'] || new Buffer('')).toString());
        console.log(metadata);
    }
);