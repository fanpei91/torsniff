## 介绍

p2pspider 是一个 DHT 爬虫 + BT 客户端的结合体, 从全球 DHT 网络里"嗅探"人们正在下载的资源, 并把资源的`metadata`(种子的主要信息)从远程 BT 客户端下载, 并生成资源磁力链接. 通过磁力链接, 你就可以下载到资源文件.

[English document](https://github.com/Fuck-You-GFW/p2pspider#introduction)


## 用途

你可以使用 p2pspider 打造私人种子库(比如: 海盗湾), 也可拿它做资源数据挖掘与分析。

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
        address: '0.0.0.0',
        port: 6881,
        nodesMaxSize: 200,   // be careful
        maxConnections: 400, // be careful
        timeout: 5000,
        filter: function(infohash, callback) {
            var theInfohashIsExistsInDatabase = false; // false => always to download the metadata even though the metadata is exists.
            callback(theInfohashIsExistsInDatabase);
        }
    },
    function(metadata) {
        console.log(metadata);
    }
);
```

或者使用 `Promise` 替代回调函数：

```js
p2pspider(options).then(function(metadata) {
    console.log(metadata);
});
```

**目前只能放在有公网 IP 的主机上执行, 或者路由器设置端口转发.**


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

You can also use p2pspider to build your own torrents database(e.g: The Pirate Bay) for data mining and analyzing.

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
        address: '0.0.0.0',
        port: 6881,
        nodesMaxSize: 200,   // be careful
        maxConnections: 400, // be careful
        timeout: 5000,
        filter: function(infohash, callback) {
            var theInfohashIsExistsInDatabase = false; // false => always to download the metadata even though the metadata is exists.
            callback(theInfohashIsExistsInDatabase);
        }
    },
    function(metadata) {
        console.log(metadata);
    }
);
```

Or using `Promise` instead of callback functions:

```js
p2pspider(options).then(function(metadata) {
    console.log(metadata);
});
```

**p2pspider only run on a host which has dedicated public IP.**


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
