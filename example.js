"use strict"

var DHTSpider = require('./p2pspider/dhtspider');
var BTClient = require('./p2pspider/btclient');

var btclient = new BTClient({ timeout: 1000 * 10 });
btclient.on('complete', (metadata, infohash, rinfo) => {

    // metadata.info 含有资源名字, 资源大小, 资源文件列表等信息.
    
    var name = metadata.info.name || metadata.info['utf-8.name'];
    if (name) {
        console.log('\n');
        console.log('name: %s', name.toString());
        console.log('from: %s:%s', rinfo.address, rinfo.port );
        console.log('link: magnet:?xt=urn:btih:%s', infohash.toString('hex'));
    }
});

DHTSpider.start({
    btclient: btclient,
    address: '0.0.0.0',
    port: 6219,
    nodesMaxSize: 4000  // 值越大, 网络, 内存, CPU 消耗就越大, 收集速度会变慢.
});