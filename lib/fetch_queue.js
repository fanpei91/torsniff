'use strict';

var utils = require('./utils');

var FetchQeueue = function(timeout, fetchDataFunc) {
    this.queues = {};
    setInterval(function() {
    	var now = new Date().getTime();
    	for(var k in this.queues) {
    		var item = this.queues[k];
    		// check timeout
    		if(item.lastTriedAt === 0 || now - item.lastTriedAt > timeout) {
    			if(item.queues.length === 0) {
    				// timeout and no items in queue, remove item
    				delete this.queues[k];
    			} else {
    				// timeout and try to fetch from next host
    				item.lastTriedAt = now;
    				var meta = item.queues.shift();
    				fetchDataFunc(meta);
    			}
    		}
    	}
    }, 200);
};

FetchQeueue.prototype.push = function(meta) {
	var hash = meta.infohash;
	if(!this.queues[hash]) {
		this.queues[hash] = {
			'lastTriedAt': 0,
			'queue': []
		};
	} else {
		this.queues[hash].queue.push(meta);
	}
}

FetchQeueue.prototype.remove = function(hash) {
	delete this.queues[hash];
}

module.exports = FetchQeueue;