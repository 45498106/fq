module.exports = function() {
  var os = require('os');
  var path = require('path');
  var fs = require('fs');
  var URL = require('url');
  const version = require('../package.json').version;
  var debug = function(content) {
    if (process.env.NODE_ENV === 'TEST') return;
    console.log('freess(' + version + '): ' + content);
  };
  if (os.platform() !== 'win32') {
    return debug('目前仅支持windows平台');
  }
  const {
    dirName,
    githubBaseUrl
  } = require('./const');
  var args = process.argv.slice(2);
  var restartTime = 60 * 60 * 1000;
  var usage = '用法：ss [ OPTIONS ] \nOPTIONS: -t=restart_interval_time(minites)  重启客户端的时间间隔(分钟)';
  if (process.env.NODE_ENV !== 'TEST') {
    if (args.length > 1) {
      console.log(usage);
    } else if (args.length === 1) {
      if (args[0] === '-h') {
        console.log(usage);
        return;
      }
      if (args[0] === '-v') {
        console.log('freess版本: ' + version);
        return;
      } else if (/^-t=\d+$/.test(args[0])) {
        restartTime = args[0].split('=')[1] * 60 * 1000 || restartTime;
        if(restartTime < 10 * 60 * 1000) {
          console.log('重启间隔时间最少为10分钟！');
          restartTime = 10 * 60 * 1000;
        }
      } else {
        console.log('ss -h 获取帮助');
      }
    }
  }

  var { request } = require('./request');
  debug('请稍候 ...');
  return request(githubBaseUrl + '/package.json').then(data => {
    data = JSON.parse(data);
    if (data.version !== version) {
      debug(`版本${version}已经废弃，请更新freess的最新版本${data.version}`);
    }
    debug('正在配置...');
    return request(githubBaseUrl + '/bin/config');
  }, err => {
    if (err.code === 'ETIMEDOUT') {
      return Promise.reject('网络异常，请稍候重试');
    }
    return Promise.reject(err);
  }).then(remoteConfig => {
    remoteConfig = JSON.parse(remoteConfig);
    var configPath = path.join(dirName, remoteConfig.configName);
    var { has } = require('./file');
    if (!has(dirName, 'dir')) {
      fs.mkdirSync(dirName);
      fs.writeFileSync(configPath, JSON.stringify(remoteConfig.config, null, 2));
    }
    return remoteConfig;
  }).then(remoteConfig => {
    var clientPath = path.join(dirName, remoteConfig.clientName);
    var { getSHA } = require('./file');
    if (getSHA(clientPath) !== remoteConfig.sha.toLowerCase()) {
      let { downloadClient } = require('./client');
      return downloadClient(remoteConfig);
    }
    return remoteConfig;
  }).then(remoteConfig => {
    var { startClient } = require('./client');
    var timer = setInterval(function() {
      startClient(remoteConfig, timer).then(function() {
        debug('客户端已经重启');
      }).catch(function(err) {
        debug('抱歉，发生了错误：' + err);
        process.exit(0);
      });
    }, restartTime || remoteConfig.interval || 60 * 60 * 1000);
    return startClient(remoteConfig, timer);
  }).then(clientProcessId => {
    return {
      result: 'success',
      data: clientProcessId
    }
  }).catch(function(err) {
    debug('抱歉，发生了错误：' + err);
    if (process.env.NODE_ENV !== 'TEST') {
      process.exit(0);
    }
    return {
      result: 'error',
      data: err
    }
  });

}
