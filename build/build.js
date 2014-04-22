/**
 * Example : 
 * node build.js optimize=true exclude=map,force,line output=echarts.js plain=true
 * @param optimize 是否压缩, 默认false
 * @param exclude 不打包的图表，多个图表使用逗号分割, 默认使用所有图表
 * @param output 输出打包地址，默认为echarts.js
 * @param plain 是否打包esl, 打包的话可以直接使用scripts标签引入, 默认false
 */
var fs = require('fs');
var spawn = require('child_process').spawn;

var args = {};
process.argv.slice(2).forEach(function (val) {
    var keyVal = val.split('=');
    args[keyVal[0]] = keyVal[1];
});

var outputFile = args['output'] || 'echarts.js';
var exclude = args['exclude'] ? args['exclude'].split(',') : [];
var plain = args['plain'] === 'true' ? true : false;
var optimize = args['optimize'] === 'true' ? true : false;

var configTplStr = fs.readFileSync('./config-tpl.js', 'utf-8');
var configTpl = eval('(' + configTplStr + ')');

if (!optimize) {
    configTpl.optimize = 'none';
}
if (plain) {
    if (exclude.indexOf('map') >= 0) {
        configTpl.wrap = {
            startFile : ['wrap/start.js', "wrap/almond.js"],
            endFile : 'wrap/end.js'
        }
    } else {
        configTpl.wrap = {
            startFile : ['wrap/start.js', "wrap/almond.js"],
            endFile : 'wrap/end-map.js'
        }
    }
}

configTpl.out = outputFile;

if (exclude) {
    exclude.forEach(function (chartName) {
        if (chartName === 'map') {
            configTpl.include = configTpl.include.filter(function (path) {
                return path.indexOf('map') < 0;
            });
        } else {
            configTpl.include = configTpl.include.filter(function (path) {
                return path !== 'echarts/chart/' + chartName;
            });
        }
    });
    var chartsRequire = ['define(function (require) {'];
    configTpl.include.forEach(function (chartPath) {
        chartsRequire.push('    require("' + chartPath + '");');
    });
    chartsRequire.push('});')
    fs.writeFileSync('../src/_chart.js', chartsRequire.join('\n'), 'utf-8');

    configTpl.include.push('_chart');
}
fs.writeFileSync('_config_tmp.js', JSON.stringify(configTpl), 'utf-8');

var buildProcess = spawn('node', ['r.js', '-o', '_config_tmp.js']);
buildProcess.on('close', function () {
    fs.unlink('_config_tmp.js');
    fs.unlink('../src/_chart.js');
});
buildProcess.stdout.setEncoding('utf-8');
buildProcess.stdout.on('data', function (data) {
    console.log(data);
});
buildProcess.stderr.setEncoding('utf-8');
buildProcess.stderr.on('data', function (data) {
    throw new Error(data);
});
