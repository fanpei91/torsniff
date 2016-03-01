## 介绍

p2pspider 是一个 DHT 爬虫 + BT Client 的结合体, 从全球 DHT 网络里"嗅探"人们正在下载的资源, 并把资源的`metadata`(种子的主要信息)从 远程 BT 客户端下载, 并生成资源磁力链接. 通过磁力链接, 你就可以下载到资源文件.

## 用途

你可以使用 p2pspider 打造私人种子库, 也拿它做资源数据挖掘与分析。

## 安装

```
npm install p2pspider
```

## 使用

```js
var p2pspider = require('p2pspider');
p2pspider(function(data){
    console.log(data); //获取到的信息
})
```

建议放在公网上执行，最好是国外的 VPS。

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

fork 并拉取代码后，执行 `npm install` 安装依赖（安装的依赖较多，请耐心等待）.

现在的代码使用 `ES6` 编译，然后使用 Babel 编译。执行 `npm run watch` 持续编译，这样代码修改后就会自动编译。

然后执行 `node test/index.js` 就可以看到运行效果。

## 协议

[bep_0005](http://www.bittorrent.org/beps/bep_0005.html), [bep_0003](http://www.bittorrent.org/beps/bep_0003.html), [bep_0010](http://www.bittorrent.org/beps/bep_0010.html), [bep_0009](http://www.bittorrent.org/beps/bep_0009.html)

## 感谢

在开发这个项目时, 从 [bittorrent-protocol](https://github.com/feross/bittorrent-protocol) 和  [ut_metadata](https://github.com/feross/ut_metadata) 借鉴了一些实现代码. 非常感谢其作者 [@feross](https://github.com/feross) 指点迷津.

## 交流

如果你对此项目感兴趣, 不管你是不是开发者, 都可加 QQ 群(145234507)进行实时交流. 虽然 QQ 群看起来很 Low, 但不得不说, 特别适合快速交流.

## 提醒

不要拿这个爬虫爬取的数据分享到互联网, 因为很多敏感资源; 你懂滴资源; 侵权资源. 否则后果自负喔.

## 许可证

MIT