'use strict';

var PeerQueue = function(maxQueues, maxItemsPerQueue, timeout) {
    this.maxQueues = maxQueues;
    this.maxItemsPerQueue = maxItemsPerQueue;
    this.timeout = timeout;
    this.peerQueues = {};
    this.currentQueuesLength = 0;
};

PeerQueue.prototype.push = function(peer) {
    var infohashHex = peer.infohash.toString('hex');
    if (!this.peerQueues[infohashHex] && this.currentQueuesLength < this.maxQueues) {
        this.peerQueues[infohashHex] = { 'lastPopAt': 0, 'queue': [] };
        this.currentQueuesLength++;
    }
    if (this.peerQueues[infohashHex] && this.peerQueues[infohashHex].queue.length < this.maxItemsPerQueue) {
        this.peerQueues[infohashHex].queue.push(peer);
    }
};

PeerQueue.prototype.pop = function() {
    var now = new Date().getTime();
    for (var k in this.peerQueues) {
        var peerQueue = this.peerQueues[k];
        if (now - peerQueue.lastPopAt >= this.timeout && peerQueue.queue.length > 0) {
            peerQueue.lastPopAt = now;
            return peerQueue.queue.shift();
        } else if (peerQueue.queue.length === 0) {
            delete this.peerQueues[k];
            this.currentQueuesLength--;
        }
    }
};

PeerQueue.prototype.remove = function(infohash) {
    if (infohash) {
        var infohashHex = infohash.toString('hex');
        delete this.peerQueues[infohashHex];
        this.currentQueuesLength--;
    }
};

PeerQueue.prototype.length = function() {
    return this.currentQueuesLength;
};

module.exports = PeerQueue;
