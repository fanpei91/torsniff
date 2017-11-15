## 介绍

p2pspider 是一个种子爬虫, 它从全球 P2P 网络下载当前活跃的种子。

[English document](https://github.com/fanpei91/p2pspider#introduction)


## 用途

你可以使用 p2pspider 打造私人种子库(比如: 海盗湾), 也可做资源数据挖掘与分析（比如哪一个国家贡献小电影最多）。

## 使用
使用前, 请确保你的 `node` 版本 `>=0.12.0`, 安装依赖库( `npm install` ), 然后执行 `node index.js` 运行 p2pspider, 等一段时间。爬到的种子将会存在 `torrents` 目录里。

强烈建议使用 `pm2` 以 `cluster` 模式启动 p2pspider, 你将会看到什么叫疯狂的 p2pspider, 这将会以每小时几万种子爬取。

提示：基本只能在带公网ip的主机上运行。

## 协议

[bep_0005](http://www.bittorrent.org/beps/bep_0005.html), [bep_0003](http://www.bittorrent.org/beps/bep_0003.html), [bep_0010](http://www.bittorrent.org/beps/bep_0010.html), [bep_0009](http://www.bittorrent.org/beps/bep_0009.html)

## 感谢

在开发这个项目时, 从 [bittorrent-protocol](https://github.com/feross/bittorrent-protocol) 和  [ut_metadata](https://github.com/feross/ut_metadata) 借鉴了一些实现代码. 非常感谢其作者 [@feross](https://github.com/feross) 指点迷津.

## 许可证
MIT

---

## Introduction
p2pspider is a torrent spider, it crawls torrents that people are using to download resource from the P2P network.

## What you can do with it
You can use p2pspider to build your own torrent database(e.g: The Pirate Bay), or data mining and analyzing.

## Usage

Ensure your `node` version `>=0.12.0`, install the dependencies(`npm install`), then execute `node index.js` to run p2pspider, wait a frew minutes, the torrent files will be saved to the `torrents` directory. 

I recommend you to use `pm2` to run p2pspider in `cluster` mode, you will see a CRAZY p2pspider. 

p2pspider only works on a host which has a public ip.

## Protocols
[bep_0005](http://www.bittorrent.org/beps/bep_0005.html), [bep_0003](http://www.bittorrent.org/beps/bep_0003.html), [bep_0010](http://www.bittorrent.org/beps/bep_0010.html), [bep_0009](http://www.bittorrent.org/beps/bep_0009.html)

## Thanks
When I was developing this project, I referenced some code from [bittorrent-protocol](https://github.com/feross/bittorrent-protocol) and  [ut_metadata](https://github.com/feross/ut_metadata), thanks to their author,  [@feross](https://github.com/feross)'s pointing.

## License
MIT
