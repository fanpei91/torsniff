
import DHTSpider from './dht';
import BTClient from './btclient';

export default (options = {}, callback) => {

  if(typeof options === 'function'){
    callback = options;
    options = {};
  }

  let btclient = new BTClient({ timeout: options.options || 1000 * 10 });

  btclient.on('complete', (metadata, infohash, rinfo) => {
    let data = metadata;
    data.address = rinfo.address;
    data.port = rinfo.port;
    data.infohash = infohash.toString('hex');
    data.magnet = 'magnet:?xt=urn:btih:' + data.infohash;

    if(callback){
      callback(data);
    }else{
      console.log(data.name, data.magnet);
    }
  });

  DHTSpider.start({
    btclient: btclient,
    address: '0.0.0.0',
    port: options.port || 6219,
    nodesMaxSize: options.nodesMaxSize || 4000  // 值越大, 网络, 内存, CPU 消耗就越大, 收集速度会变慢.
  });
};

module.exports = exports.default;