'use strict';

var P2PSpider = require('../lib');
var sqlAction = require("./mysql.js"); //mysql 配置文件

//var redis = require("redis");
//var sub = redis.createClient({password: 123456}),
//    pub = redis.createClient({password: 123456});

var p2p = P2PSpider({
    nodesMaxSize: 500,   // be careful
    maxConnections: 500, // be careful
    timeout: 5000
});

p2p.ignore(function (infohash, rinfo, callback) {
    // false => always to download the metadata even though the metadata is exists.
    var theInfohashIsExistsInDatabase = false;
    callback(theInfohashIsExistsInDatabase);
});

p2p.on('metadata', function (metadata) {
    var file_number = 1;
    var result = [];
    var tmpArr = [];
    if(metadata.info.name) {
        tmpArr.push(metadata.info.name.toString());
    }else {
        return;
    }
    tmpArr.push(metadata.magnet);
    tmpArr.push(metadata.infohash);
    if(metadata.info.files) {
        var ignoreCount = 0;
        var listFileSize = 0;
        var flag = false; //判断是不是无效文件
        var text = []; //多个文件名
        for(var i = 0;i < metadata.info.files.length;i++) {
            var path_name = metadata.info.files[i].path ? metadata.info.files[i].path.toString() : '';
            if(path_name.indexOf('_____padding_file') > -1) {
                ignoreCount++;
                flag = true;
            } else {
                listFileSize += parseInt(metadata.info.files[i].length);
            }
            if(!flag && text.length <=20) {
                // console.log(metadata.info.files[i])
                text.push(metadata.info.files[i].path.toString());
                flag = false;
            }
        }
         console.log('原始数量',metadata.info.files.length);
        file_number = metadata.info.files.length - ignoreCount;
        // console.log('结果',metadata.info.files.length - ignoreCount,'--------------------------------')
        // console.log('文件大小',listFileSize,'+++++++++++++++++++++++++++++++')
        tmpArr.push(listFileSize);
    }else {
        tmpArr.push(metadata.info.length);
    }

    tmpArr.push(new Date().getTime());
    tmpArr.push(0);
    tmpArr.push(0);
    tmpArr.push(file_number);
    if(text) {
        tmpArr.push(text.join(','));
    }else {
        tmpArr.push('');
    }
    result.push(tmpArr);
    console.log(result);

    //sub.on("error", function (err) {
    //    console.log("Error " + err);
    //});
    //pub.on("error", function (err) {
    //    console.log("Error " + err);
    //});



    //pub.publish('getBt',JSON.stringify(result));
    //sub.on('message',function(channel,data) {
    //   console.log(channel,data);
    //});
    //sub.subscribe('getBt');








    //var msg_count = 0;
    //
    //sub.on("subscribe", function (channel, count) {
    //    pub.publish("a nice channel", "I am sending a message.");
    //    pub.publish("a nice channel", "I am sending a second message.");
    //    pub.publish("a nice channel", "I am sending my last message.");
    //});
    //
    //sub.on("message", function (channel, message) {
    //    console.log("sub channel " + channel + ": " + message);
    //    msg_count += 1;
    //    if (msg_count === 3) {
    //        sub.unsubscribe();
    //        sub.quit();
    //        pub.quit();
    //    }
    //});
    //
    //sub.subscribe("a nice channel");




    sqlAction.insert('INSERT INTO list(name,magnet,infoHash,size,catch_date,hot,download_count,file_number,content_file) VALUES ?',[result],function (err, vals, fields) {});

});

p2p.listen(6881, '0.0.0.0');