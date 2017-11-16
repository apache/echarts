var echarts = require("echarts");

var gexf = require("./gexf");

exports.gexf = gexf;

var prepareBoxplotData = require("./prepareBoxplotData");

exports.prepareBoxplotData = prepareBoxplotData;
var version = '1.0.0';

// For backward compatibility, where the namespace `dataTool` will
// be mounted on `echarts` is the extension `dataTool` is imported.
// But the old version of echarts do not have `dataTool` namespace,
// so check it before mounting.
if (echarts.dataTool) {
  echarts.dataTool.version = version;
  echarts.dataTool.gexf = gexf;
  echarts.dataTool.prepareBoxplotData = prepareBoxplotData;
}

exports.version = version;