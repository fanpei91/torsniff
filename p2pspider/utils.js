'use strict'

const crypto = require('crypto');

exports.randomID = function() {
    return crypto.createHash('sha1').update(crypto.randomBytes(20)).digest();
};