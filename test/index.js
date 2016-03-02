'use strict';

var p2pspider = require('../lib/index');

p2pspider(
    {
        // DHT 监听地址
        address: '0.0.0.0',
        
        // DHT 监听端口
        port: 6881,
        
        // 每秒发送find_node请求数. 在资源允许的情况下, 数字越大, 爬取速度越快.
        nodesMaxSize: 2000,
        
        // 最大 BT Client 连接数.
        // 在资源允许的情况下, 数字越大, 爬取速度越快, 但是也危险.
        // 请不要超过系统最大 TCP 连接数. 否则可能会出现系统过载而宕机.
        maxConnections: 2000,
        
        // BT Client TCP 超时时间.
        timeout: 5000,
        
        // 如果你存储了infohash到数据库, 那么请根据此infohash查询是否存在, 如果存在了, 爬虫将不会重复爬取.
        // callback 接受bool值. 为 true 时, 不爬取. 为 false, 要爬取.
        filter: function(infohash, callback) {
            var existsInDatabase = false;
            callback(existsInDatabase);
        }
    },
    
    // 你可以把你感兴趣的数据保存到数据库, 文件, 或者远程服务.
    function(metadata) {
        console.log(metadata);
    }
);