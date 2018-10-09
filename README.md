torsniff - a sniffer fetching torrents from BT network
======================================


**English** | [简体中文](./README-zh.md)

## Introduction
torsniff is a torrent sniffer, it fetches torrents that people are using to download moives, music, docs, games and so on from the BitTorrent network.

A tottent have valuable infomation, so you can use torsniff to build your own torrent database(e.g: The Pirate Bay), or to do data mining and analyzing.


## Installation

Just download torsniff from [releases](https://github.com/fanpei91/torsniff/releases) directly. If you want to install from compiling source code, you figure out the way by yourslef. :)

## Usage

```bash
$ ./torsniff -h

Usage:
  torsniff [flags]

Flags:
  -a, --addr string        listen on given address (default "0.0.0.0")
  -d, --dir string         the directory to store the torrents (default "/Users/iTorm")
  -h, --help               help for torsniff
  -f, --maxFriends int     max fiends to make with per second (default 500)
  -e, --peers int          max peers(TCP) to connect to download torrents (default 400)
  -p, --port int16         listen on given port (default 6881)
  -t, --timeout duration   max time allowed for downloading torrents (default 10s)
  -v, --verbose            run in verbose mode (default true)
```

## Quick start
Use default flags:

`./torsniff`

## Requirement

A host having a public IP, or UDP port forwarding in private network.

## Protocols
- [DHT Protocol](http://www.bittorrent.org/beps/bep_0005.html)
- [The BitTorrent Protocol Specification](http://www.bittorrent.org/beps/bep_0003.html)
- [BitTorrent  Extension Protocol](http://www.bittorrent.org/beps/bep_0010.html)
- [Extension for Peers to Send Metadata Files](http://www.bittorrent.org/beps/bep_0009.html)

## License
MIT
