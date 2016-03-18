/*
    tingyuan 2015 12
    感谢 http://www.ishadowsocks.com/ 提供的免费账号
    自由无价
    https://github.com/lovetingyuan/fq
*/
//默认配置
"use strict";

var defaultConfig = {
    "configs": [],
    "strategy": null,
    "index": 5,
    "global": false,
    "enabled": true,
    "shareOverLan": false,
    "isDefault": false,
    "localPort": 1080,
    "pacUrl": null,
    "useOnlinePac": false,
    "availabilityStatistics": false
};

var fs = require('fs');
var dirName = "shadowsocks";
var clientName = "shadowsocks.exe";
var clientFilePath = dirName + "/" + clientName;
var configFilePath = dirName + "/gui-config.json";

start();

function tyfq() {
    start();
}

function start() {

    try {
        /* 检查用户是否安装依赖 */
        if (require('cheerio') && require('download')) {
            buildConfigDir();
        }
    } catch (e) {
        if (e && e.code && e.code.toUpperCase() === 'MODULE_NOT_FOUND') {
            var process = require('child_process');
            console.log('start to install modules, please wait...');
            process.exec('npm install',
                function(error, stdout, stderr) {
                    if (error === null) {
                        console.log("install successfully!");
                        buildConfigDir();
                    } else {
                        console.log('install failed...try again...');
                        return;
                    }
                }
            );
        } else {
            console.log('sorry, failed with unknown reason...');
            return;
        }
    }
}

// Utility function that downloads a URL and invokes
// callback with the data.
function download(url, callback) {
    var protocal = url.substring(0, url.indexOf(':')).toLowerCase();
    if (protocal !== 'http' && protocal !== 'https') {
        protocal = 'http';
    }
    var http = require(protocal);
    http.get(url, function(res) {
        var data = "";
        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on("end", function() {
            callback(data);
        });
    }).on("error", function() {
        callback(null);
    });
}

function buildConfigDir() {
    var buildConfigFile = () => {
        fs.exists(configFilePath, function(exist) {
            if (!exist) {
                writeConfig(JSON.stringify(defaultConfig, null, 4), updateConfigFile);
            } else {
                updateConfigFile();
            }
        });
    };

    fs.exists(dirName, function(exists) {
        if (exists) {
            buildConfigFile();
        } else {
            fs.mkdir(dirName, buildConfigFile);
        }
    });
}

function readConfig(callback) {
    fs.readFile(configFilePath, 'utf8', function(err, data) {
        if (err) {
            console.log('readfile error');
        } else {
            try {
                var ssconfig = JSON.parse(data);
                callback(ssconfig);
            } catch (e) {
                console.log('fail to parse config');
            }
        }
    });
}

function writeConfig(content, callback) {
    fs.writeFile(configFilePath, content, 'utf8', callback);
}

function updateConfigFile() {
    var accountInfo = [];
    download("http://www.ishadowsocks.com/", function(data) {
        var cheerio = require("cheerio");
        if (data) {
            var $ = cheerio.load(data, {
                decodeEntities: false
            });
            var $targets = $("#free h4");
            var oneaccount = {};
            var keys = ['server', 'server_port', 'password', 'method', 'remarks'];
            if ($targets.length !== 6 * 3) {
                console.log("attension!! there is some errors happened!");
                return;
            }
            $targets.each(function(index, ele) {
                if (index % 6 < 4) {
                    oneaccount[keys[index % 6]] = $(ele).text().split(":")[1];
                } else if (index % 6 === 4) {
                    oneaccount[keys[4]] = 'ishadowsocks';
                } else {
                    accountInfo.push(oneaccount);
                    oneaccount = {};
                }
            });

            readConfig(function(ssconfig) {
                for (var i = 0; i < ssconfig.configs.length; i++) {
                    if (ssconfig.configs[i].remarks === 'ishadowsocks') {
                        ssconfig.configs.splice(i, 1);
                        i--;
                    }
                }
                ssconfig.index = ssconfig.configs.length;
                accountInfo.forEach(function(element, index, array) {
                    ssconfig.configs.push(element);
                });
                writeConfig(JSON.stringify(ssconfig, null, 4), startSsClient);
            });
        } else {
            console.log("download error");
        }
    });
}

function startSsClient() {
    console.log("starting ss client...");

    var exeClient = () => {
        console.log('ss client has started, you can browse now...');
        var process = require('child_process');
        process.execFile(clientFilePath,
            function(error, stdout, stderr) {
                console.log("you have closed ss client.....");
            }
        );
    };

    var downloadClient = (_downloadlink, func) => {
        console.log("please wait...");
        var Download = require('download');
        new Download({
                mode: '777',
                extract: true
            }).get(_downloadlink)
            .rename(clientName)
            .dest(dirName)
            .run(func);
    };
    fs.exists(clientFilePath, function(exists) {
        download("https://github.com/shadowsocks/shadowsocks-windows/releases/", function(data) {
            var cheerio = require("cheerio");
            var lastversion = "";
            var downloadlink = "";
            if (data) {
                var $ = cheerio.load(data, {
                    decodeEntities: false
                });
                lastversion = $(".release-header").first().find('a').first().text();
                downloadlink = 'https://github.com' + $(".release-downloads").first().find('a').first().attr('href');
                readConfig(function(ssconfig) {
                    if (lastversion !== ssconfig.version) {
                        if (exists) {
                            console.log('ss client is outofdate, start to update client...');
                        } else {
                            console.log('no ss client, start to download client...');
                        }
                        ssconfig.version = lastversion;
                        writeConfig(JSON.stringify(ssconfig, null, 4), function() {
                            downloadClient(downloadlink, exeClient);
                        });
                    } else if (!exists) {
                        console.log('no ss client, start to download client...');
                        downloadClient(downloadlink, exeClient);
                    } else {
                        exeClient();
                    }
                });
            } else {
                console.log("fail to get version info");
            }
        });
    });
}

exports.tyfq = tyfq;
