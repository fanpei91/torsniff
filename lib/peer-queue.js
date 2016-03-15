'use strict';

var PeerQueue = function (maxSize, perLimit) {
    this.maxSize = maxSize || 200;
    this.perLimit = perLimit || 10;
    this.peers = {};
    this.reqs = [];
};

PeerQueue.prototype._shift = function () {
    if (this.length() > 0) {
        var req = this.reqs.shift();
        this.peers[req.infohash.toString('hex')] = [];
        return req;
    }
};

PeerQueue.prototype.push = function (peer) {
    var infohashHex = peer.infohash.toString('hex');
    var peers = this.peers[infohashHex];

    if (peers && peers.length < this.perLimit) {
        peers.push(peer);
    }
    else if (this.length() < this.maxSize) {
        this.reqs.push(peer);
    }
};

PeerQueue.prototype.shift = function (infohash, successful) {
    if (infohash) {
        var infohashHex = infohash.toString('hex');
        if (successful === true) {
            delete this.peers[infohashHex];
        }
        else {
            var peers = this.peers[infohashHex];
            if (peers) {
                if (peers.length > 0) {
                    return peers.shift();
                }
                else {
                    delete this.peers[infohashHex];
                }
            }
        }
    }
    return this._shift();
};

PeerQueue.prototype.length = function () {
    return this.reqs.length;
};

module.exports = PeerQueue;