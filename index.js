/*
<<<<<<< HEAD
    tingyuan 2015 12
    感谢 http://www.ishadowsocks.com/ 提供的免费账号
    自由无价
    https://github.com/lovetingyuan/fq
=======
	tingyuan 2015 12
	感谢 http://www.ishadowsocks.net/ 提供的免费账号
	自由无价
>>>>>>> a29b1a34ef78ad15be0ac9318e33287979fa056f
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
            });
    } else {
        console.log('sorry, failed with unknown reason...');
        return;
    }
}


/**
 * 抓取网页数据
 * @param  {string}   url      要抓取的地址，必须是合法的地址
 * @param  {Function} callback 抓取成功后的回调函数，参数是网页的数据
 */
function grabUrl(url, callback) {
    var protocal = url.substring(0, url.indexOf(':')).toLowerCase();
    if (protocal !== 'http' && protocal !== 'https') {
        protocal = 'http';
    }
    var http = require(protocal);
    var data = "";
    http.get(url, function(res) {
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

function getLatestVersion(githubPageData) {
    var cheerio = require("cheerio");
    var $ = cheerio.load(githubPageData, {
        decodeEntities: false
    });
    return $(".release-title a").eq(0).text();
}

function getLatestDownloadLink(githubPageData) {
    var cheerio = require("cheerio");
    var $ = cheerio.load(githubPageData, {
        decodeEntities: false
    });
    return $("ul.release-downloads a").prop('href');
}

function buildConfigDir() {
    var fs = require('fs');
    var buildConfigFile = () => {
        fs.exists(configFilePath, function(exist) {
            if (!exist) {
                writeJson(configFilePath, JSON.stringify(defaultConfig, null, 4), updateConfigFile);
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

/**
 * 读取JSON数据
 * @param  {string}   jsonPath json文件路径
 * @param  {Function} callback 读取完毕时的回调函数，参数是json文件的json对象
 */
function readJson(jsonPath, callback) {
    var fs = require('fs');
    fs.readFile(jsonPath, 'utf8', function(err, data) {
        if (err) {
            console.log('read json file error');
        } else {
            try {
                var jsonObj = JSON.parse(data);
                callback(jsonObj);
            } catch (e) {
                console.log('fail to parse json file');
            }
        }
    });
}

/**
 * 将json数据写入文件中
 * @param  {string}   path     json文件的路径
 * @param  {object/string}   content  json数据，可以是对象或者合法的字符串
 * @param  {Function} callback 写入成功后的回调函数
 */
function writeJson(path, content, callback) {
    var fs = require('fs');
    if (typeof content === 'object') {
        try {
            content = JSON.stringify(content);
            fs.writeFile(path, content, 'utf8', callback);
        } catch (e) {
            console.log("invalid json string: " + e.toString());
            return;
        }
    } else if (typeof content === 'string') {
        fs.writeFile(path, content, 'utf8', callback);
    } else {
        console.log("error with reason: " + e.toString());
        return;
    }
}

/**
 * 获取免费ss账号
 * @param  {string} freePageData ss page data
 * @return {array}              获取到的账号数据
 */
function getFreeAccount(freePageData) {
    var cheerio = require("cheerio");
    var $ = cheerio.load(data, {
        decodeEntities: false
    });
    var $targets = $("#free h4");
    var accountInfo = [];
    var oneAccount;
    var keys = ['server', 'server_port', 'password', 'method', 'remarks'];
    $targets.each(function(index, ele) {
        oneAccount = {};
        if (index % 6 < 4) {
            oneaccount[keys[index % 6]] = $(ele).text().split(":")[1];
        } else if (index % 6 === 4) {
            oneaccount[keys[4]] = 'ishadowsocks';
        } else {
            accountInfo.push(oneAccount);
        }
    });
    var accountNum = accountInfo.length;
    if (accountNum !== 3) {
        console.log("there is some errors happened");
        return;
    }
    for (var i = 0; i < accountNum; i++) {
        for (var j = 0; j < keys.length; j++) {
            if (!accountInfo[i][keys[j]]) {
                console.log("there is some errors happened");
                return;
            }
        }
    }
    return accountInfo;
}

function updateConfigFile() {
    grabUrl("http://www.ishadowsocks.net/", function(data) {
        if (!data) {
            console.log("fail to get ss account");
            return;
        }
        readJson(configFilePath, function(jsonObj) {
            jsonObj.configs = getFreeAccount(data);
            writeJson(configFilePath, jsonObj, startSsClient);
        });
    });
}

function downloadFile(path, name, link, callback) {
    var Download = require('download');
    new Download({
            mode: '777',
            extract: true
        }).get(link)
        .rename(name)
        .dest(path)
        .run(callback);
}

function startExeFile(filepath, callback) {
    var child_process = require('child_process');
    child_process.execFile(filepath, callback);
}

function startSsClient() {
    console.log("starting ss client...");

    fs.exists(clientFilePath, function(exists) {
        download("https://github.com/shadowsocks/shadowsocks-windows/releases/", function(data) {
            if (!data) {
                console.log("fail to get client page data");
                return;
            }
            var latestVersion = getLatestVersion(data);
            var downloadLink = getLatestDownloadLink(data);

            readJson(configFilePath, function(ssconfig) {
                if (lastversion != ssconfig.version) {
                    if (exists) {
                        console.log('ss client is outofdate, start to update client...');
                    } else {
                        console.log('no ss client, start to download client...');
                    }
                    ssconfig.version = lastversion;
                    writeConfig(configFilePath, JSON.stringify(ssconfig, null, 4), function() {
                        downloadClient(downloadlink, exeClient);
                    });
                } else if (!exists) {
                    console.log('no ss client, start to download client...');
                    downloadClient(downloadlink, exeClient);
                } else {
                    exeClient();
                }
            });
        });
    });
}

exports.tyfq = tyfq;
