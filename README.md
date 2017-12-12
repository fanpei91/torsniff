## 介绍

p2pspider 是一个种子爬虫, 它从全球 P2P 网络下载当前活跃的种子。

[English document](https://github.com/fanpei91/p2pspider#introduction)

## 用途

你可以使用 p2pspider 打造私人种子库(比如: 海盗湾), 也可做资源数据挖掘与分析（比如哪一个国家贡献小电影最多）。

## 安装
### 从源码安装
```bash
go get github.com/fanpei91/p2pspider
```

### 下载可执行文件
[Download p2pspider](https://github.com/fanpei91/p2pspider/releases)

## 使用
```bash
p2pspider -h

Usage of p2pspider:
  -a string
    	listen on given address (default "0.0.0.0")
  -d string
    	the directory to store the torrent file (default "/$HOME/torrents")
  -e int
    	max peers(TCP) to connenct to download torrent file (default 400)
  -f int
    	max friends to make with per second (default 500)
  -p int
    	listen on given port (default 6881)
  -s string
    	token secret (default "$p2pspider$")
  -t duration
    	max time allowed for downloading torrent file (default 10s)
  -v	run in verbose mode (default true)
```

## 使用举例
```bash
#使用默认参数
p2pspider
```

## 注意

请在有公网IP的主机上运行，若要在内网执行，需要设置NAT映射。建议选择前者。

## 参考

[bep_0005](http://www.bittorrent.org/beps/bep_0005.html), [bep_0003](http://www.bittorrent.org/beps/bep_0003.html), [bep_0010](http://www.bittorrent.org/beps/bep_0010.html), [bep_0009](http://www.bittorrent.org/beps/bep_0009.html)

## 许可证
MIT

---

## Introduction
p2pspider is a torrent spider, it crawls torrents that people are using to download resource from the P2P network.

## What you can do with it
You can use p2pspider to build your own torrent database(e.g: The Pirate Bay), or data mining and analyzing.

## Install
### compile from source code
```bash
go get github.com/fanpei91/p2pspider
```

### Download executable p2pspider
[Download p2pspider](https://github.com/fanpei91/p2pspider/releases)

# Usage
```bash
p2pspider -h

Usage of p2pspider:
  -a string
    	listen on given address (default "0.0.0.0")
  -d string
    	the directory to store the torrent file (default "/$HOME/torrents")
  -e int
    	max peers(TCP) to connenct to download torrent file (default 400)
  -f int
    	max friends to make with per second (default 500)
  -p int
    	listen on given port (default 6881)
  -s string
    	token secret (default "$p2pspider$")
  -t duration
    	max time allowed for downloading torrent file (default 10s)
  -v	run in verbose mode (default true)
```

## Usage example
```bash
#default arguments
p2pspider
```

## Notice

p2pspider only works on a host which has a public ip.

## Feferences
[bep_0005](http://www.bittorrent.org/beps/bep_0005.html), [bep_0003](http://www.bittorrent.org/beps/bep_0003.html), [bep_0010](http://www.bittorrent.org/beps/bep_0010.html), [bep_0009](http://www.bittorrent.org/beps/bep_0009.html)

## License
MIT
