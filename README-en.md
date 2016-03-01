##Intro
P2P Spider is a crawler combined with DHT Crawler and BitTorrent Client. 

It crawls what people is downloading on the worldwide DHT Network, and Metadata (the data of a torrent) from remote BitTorrent Clients. P2P Spider also generates Magnet URLs, you can simply download the file you want by using Magnet. 

You can also use P2P Spider to build your own BitTorrent database for data crawling and analyzing.

##Install
```
npm install p2pspider
```

##Usage

```js
var p2pspider = require('p2pspider');
p2pspider(function(data){
    console.log(data); // Crawled data
})
```

*We highly recommend to run P2P Spider on an oversea VPS which has dedicated public IP.*

##Upcoming features
* Performance optimization
* Data storage
* Cross-platform GUI
* Data sharing
* Data downloading
* Video streaming

##Goals
* Make P2P Spider be an easy-using tool for you. 
* You can use it to search torrents, to download resources, even to share the database. 
* You can play videos when you're downloading them. 
* Build an another QVod platform is possible.

##Contribute
After forking the code, use ```npm install``` to install required packages.

Code wrote with ```ES6```, and used Babel to compile.

Use ```npm run watch``` to keep compiling. It will compile automatically when code edited.

Run ```node test/index.js``` to review results.

##Protocols
[bep_0005](http://www.bittorrent.org/beps/bep_0005.html), [bep_0003](http://www.bittorrent.org/beps/bep_0003.html), [bep_0010](http://www.bittorrent.org/beps/bep_0010.html), [bep_0009](http://www.bittorrent.org/beps/bep_0009.html)

##Thanks
When I was developing this project, I references some code from [bittorrent-protocol](https://github.com/feross/bittorrent-protocol) and  [ut_metadata](https://github.com/feross/ut_metadata), thanks to their author,  [@feross](https://github.com/feross)'s pointing.

##Notice
Please don't share the data P2P Spider crawled to the internet. 

Because sometimes it crawls sensitive/copyright/porn data.

##License
MIT



