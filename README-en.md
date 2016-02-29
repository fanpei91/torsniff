##Intro
P2Pspider is a crawler combined with DHT Crawler and BitTorrent Client. 

It crawls what people is downloading on the worldwide DHT Network, and Metadata (the data of a torrent) from remote BitTorrent Clients. It also generates Magnet URLs, by using Magnet URLs, you can simply download the file you want. 

You can also use P2Pspider to build your own BitTorrent database for data crawling and analyzing.

##Install P2Pspider
```
git clone https://github.com/Fuck-You-GFW/p2pspider
```

##Usage
1. Make sure your Node.js version is higher than 4.0.0, in other words, your Node.js environment supports ES6. 

2. Before the first starting, please use ```npm install``` to install required packages. 

2. After installing required packages, use ```node example.js``` to start P2Pspider. 

*It may take some time till data outputs, depends on your network performance.*

*We highly recommend to run P2Pspider on an oversea VPS which has dedicated public IP, because P2Pspider may not work inside a local area connection.*

##Custom
You can edit example.js to set actions when data crawled.

```example.js``` is a simple example for you.

##Goals
* Make P2Pspider be an easy-using tool for you. 

* You can use it to search torrents, to download resources, even to share the database. 

* You can play videos when you're downloading them. 

* Build an another QVod service is possible.

##Protocols
[bep_0005](http://www.bittorrent.org/beps/bep_0005.html), [bep_0003](http://www.bittorrent.org/beps/bep_0003.html), [bep_0010](http://www.bittorrent.org/beps/bep_0010.html), [bep_0009](http://www.bittorrent.org/beps/bep_0009.html)

##Thanks
When I was developing this project, I references some code from [bittorrent-protocol](https://github.com/feross/bittorrent-protocol) and  [ut_metadata](https://github.com/feross/ut_metadata), thanks to their author,  [@feross](https://github.com/feross)'s pointing.

##Discussing
If you're interested in this project, whether you're a developer or not, you can join our QQ Group "145234507" for discussing.

##Notice
Please don't share the data P2Pspider had crawled to the internet. 

Because sometimes it crawls sensitive/copyright/porn data.

##License
MIT



