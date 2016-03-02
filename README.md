## 介绍

p2pspider 是一个 DHT 爬虫 + BT 客户端的结合体, 从全球 DHT 网络里"嗅探"人们正在下载的资源, 并把资源的`metadata`(种子的主要信息)从远程 BT 客户端下载, 并生成资源磁力链接. 通过磁力链接, 你就可以下载到资源文件.

[English document](https://github.com/Fuck-You-GFW/p2pspider#introduction)


## 用途

你可以使用 p2pspider 打造私人种子库, 也可拿它做资源数据挖掘与分析。

## 安装

```
git clone https://github.com/Fuck-You-GFW/p2pspider
```

## 使用
使用前, 请确保你的 `node` 版本 `>=0.12.0`.

```js
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
```

建议放在有公网 IP 的主机上执行。

## 待做

>* 效率优化
>* 数据保存
>* 跨平台 GUI 化
>* 数据共享
>* 资源下载
>* 视频流媒体播放

## 目标

打造成人人都能用的神器, 可以用它搜索种子; 下载资源; 共享数据库; 如果是视频, 可边下载边播放; 打造成分布式快播是可以有滴. :)

## 贡献代码

fork 并拉取代码后，执行 `npm install` 安装依赖, 然后执行 `node test/index.js` 就可以看到测试效果。

## 协议

[bep_0005](http://www.bittorrent.org/beps/bep_0005.html), [bep_0003](http://www.bittorrent.org/beps/bep_0003.html), [bep_0010](http://www.bittorrent.org/beps/bep_0010.html), [bep_0009](http://www.bittorrent.org/beps/bep_0009.html)

## 感谢

在开发这个项目时, 从 [bittorrent-protocol](https://github.com/feross/bittorrent-protocol) 和  [ut_metadata](https://github.com/feross/ut_metadata) 借鉴了一些实现代码. 非常感谢其作者 [@feross](https://github.com/feross) 指点迷津.

## 提醒

不要拿这个爬虫爬取的数据分享到互联网, 因为很多敏感资源; 色情资源; 侵权资源. 否则后果自负喔.

## 许可证
MIT

---

##Introduction
p2pspider is a crawler combined with DHT Spider and BitTorrent Client.

It crawls what people is downloading on the worldwide DHT Network, and `metadata` (the core data of a torrent) from remote BitTorrent Clients. p2pspider also generates magnet URLs, you can import the URLs to your local BitTorrent Client in order to download the resources you want.

You can also use p2pspider to build your own torrents database for data mining and analyzing.

##Install
```
git clone https://github.com/Fuck-You-GFW/p2pspider
```

##Usage

Before using this, please ensure your `node` version `>=0.12.0`.

```js
'use strict';
var p2pspider = require('../lib/index');
p2pspider(
    {
        // DHT listening address
        address: '0.0.0.0',
        
        // DHT listening port
        port: 6881,
        
        // find_node requests be sent per second. If allowed, higher value it is, faster speed it will be.
        nodesMaxSize: 2000,
        
        // Maximum BT Client connections.
        // If allowed, higher value it is, faster speed will be.
        // Do not exceed the system maximum TCP connection number, otherwise it may crash due to overload.
        maxConnections: 2000,
        
        // BT Client TCP timeout.
        timeout: 5000,
        
        // If you store infohash to the database, you can use this to check infohash is exist or not.
        // callback gets bool value. When true, crawler don't crawl. When false, crawler crawls.
        filter: function(infohash, callback) {
            var existsInDatabase = false;
            callback(existsInDatabase);
        }
    },
    
    // You can store the data you interested to the database, or a file, even remote services. Suggest to save metadata.infohash in order to filts duplicate data.
    function(metadata) {
        console.log(metadata);
    }
);
```

*We highly recommend to run p2pspider on a host which has dedicated public IP.*

##Upcoming features
* Performance optimization
* Data storage
* Cross-platform GUI
* Data sharing
* Data downloading
* Video streaming

##Goals
* Make p2pspider be an easy-using tool for you.
* You can use it to search torrents, to download resources, even to share the database.
* You can play videos when you're downloading them.
* Build an another QVod platform is possible.

##Contribute
After forking the code, use ```npm install``` to install required packages. Run ```node test/index.js``` to review results.

##Protocols
[bep_0005](http://www.bittorrent.org/beps/bep_0005.html), [bep_0003](http://www.bittorrent.org/beps/bep_0003.html), [bep_0010](http://www.bittorrent.org/beps/bep_0010.html), [bep_0009](http://www.bittorrent.org/beps/bep_0009.html)

##Thanks
When I was developing this project, I references some code from [bittorrent-protocol](https://github.com/feross/bittorrent-protocol) and  [ut_metadata](https://github.com/feross/ut_metadata), thanks to their author,  [@feross](https://github.com/feross)'s pointing.

##Notice
Please don't share the data p2pspider crawled to the internet. Because sometimes it crawls sensitive/copyrighted/porn data.

##License
MIT