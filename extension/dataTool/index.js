var echarts = require("echarts");

var gexf = require("./gexf");

exports.gexf = gexf;

var prepareBoxplotData = require("./prepareBoxplotData");

exports.prepareBoxplotData = prepareBoxplotData;
var version = '1.0.0';
echarts.$inject({
  version: version,
  gexf: gexf,
  prepareBoxplotData: prepareBoxplotData
});
exports.version = version;