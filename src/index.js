
import DHTSpider from './dht';
import BTClient from './btclient';

export default (cb, options = {}) => {
  let btclient = new BTClient({ timeout: options.options || 1000 * 10 });
  btclient.on('complete', (metadata, infohash, rinfo) => {
    let name = metadata.info.name || metadata.info['utf-8.name'];
    if (name) {
      console.log('\n');
      console.log('name: %s', name.toString());
      console.log('from: %s:%s', rinfo.address, rinfo.port );
      console.log('link: magnet:?xt=urn:btih:%s', infohash.toString('hex'));
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