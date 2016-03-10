'use strict';

var utils = require('./utils');

var FetchQeueue = function(timeout, fetchDataFunc) {
    var interval = timeout / 10;
    var queues = this.queues = {};
    setInterval(function() {
    	var now = new Date().getTime();
    	for(var k in queues) {
    		var item = queues[k];
    		// check timeout
    		if(item.lastTriedAt === 0 || now - item.lastTriedAt > timeout) {
    			if(item.queue.length === 0) {
    				// timeout and no item in queue, remove queue
    				delete queues[k];
    			} else {
    				// timeout and try to fetch from next host
    				item.lastTriedAt = now;
    				var meta = item.queue.shift();
    				fetchDataFunc(meta);
    			}
    		}
    	}
    }, interval);
};

FetchQeueue.prototype.push = function(meta) {
	var hash = meta.infohash;
	if(!this.queues[hash]) {
		this.queues[hash] = { 'lastTriedAt': 0, 'queue': [] };
	} else {
		this.queues[hash].queue.push(meta);
	}
}

FetchQeueue.prototype.remove = function(hash) {
	delete this.queues[hash];
}

module.exports = FetchQeueue;