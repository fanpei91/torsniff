## 介绍

p2pspider 是一个 DHT 爬虫 + BT 客户端的结合体, 从全球 DHT 网络里"嗅探"人们正在下载的资源, 并把资源的`metadata`(种子的主要信息)从远程 BT 客户端下载, 并生成资源磁力链接. 通过磁力链接, 你就可以下载到资源文件.

[English document](https://github.com/fanpei91/p2pspider#introduction)


## 用途

你可以使用 p2pspider 打造私人种子库(比如: 海盗湾), 也可拿它做资源数据挖掘与分析。


## 使用
使用前, 请确保你的 `node` 版本 `>=0.12.0`, 安装了依赖库( `npm install` ), 然后执行 `node index.js` 运行 p2pspider, 爬到的种子将会存在 `torrents` 目录里。强烈建议使用 `pm2` 以 `cluster` 模式启动 p2pspider, 你将会看到什么叫疯狂的 p2pspider, 这将会以每小时几万种子爬取。建议在公网运行。 如需要在内网运行，那么需要在路由器设置端口（UDP）`6881` 转发。


## 协议

[bep_0005](http://www.bittorrent.org/beps/bep_0005.html), [bep_0003](http://www.bittorrent.org/beps/bep_0003.html), [bep_0010](http://www.bittorrent.org/beps/bep_0010.html), [bep_0009](http://www.bittorrent.org/beps/bep_0009.html)

## 感谢

在开发这个项目时, 从 [bittorrent-protocol](https://github.com/feross/bittorrent-protocol) 和  [ut_metadata](https://github.com/feross/ut_metadata) 借鉴了一些实现代码. 非常感谢其作者 [@feross](https://github.com/feross) 指点迷津.

## 提醒

不要拿这个爬虫爬取的数据分享到互联网, 因为很多敏感资源; 色情资源; 侵权资源. 否则后果自负喔. 如果真的开放了给别人, 也不要告诉我, 我他妈的不关心!

## 许可证
MIT

---

## Introduction
p2pspider is a crawler combined with DHT Spider and BitTorrent Client.

It crawls what people are downloading on the worldwide DHT Network, and `metadata` (the core data of a torrent) from remote BitTorrent Clients. p2pspider also generates magnet URLs, you can import the URLs to your local BitTorrent Client in order to download the resources you want.

You can also use p2pspider to build your own torrents database(e.g: The Pirate Bay) for data mining and analyzing.

## Usage

Before using this, please ensure your `node` version `>=0.12.0`, and installed the dependencies(`npm install`).  Execute `node index.js` to run p2pspider, the torrent file will be saved to the `torrents` directory. I recommend you to use `pm2` running p2pspider in `cluster` mode, you will see what is a CRAZY p2pspider. I recommend you run p2pspider in public network. If you run in internal network, please set the router udp `6881` port forwarding.

## Protocols
[bep_0005](http://www.bittorrent.org/beps/bep_0005.html), [bep_0003](http://www.bittorrent.org/beps/bep_0003.html), [bep_0010](http://www.bittorrent.org/beps/bep_0010.html), [bep_0009](http://www.bittorrent.org/beps/bep_0009.html)

## Thanks
When I was developing this project, I referenced some code from [bittorrent-protocol](https://github.com/feross/bittorrent-protocol) and  [ut_metadata](https://github.com/feross/ut_metadata), thanks to their author,  [@feross](https://github.com/feross)'s pointing.

## Notice
Please don't share the data p2pspider crawled to the internet. Because sometimes it crawls sensitive/copyrighted/porn data.

## License
MIT
