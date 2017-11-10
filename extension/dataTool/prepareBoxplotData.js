var quantile = require("./quantile");

var numberUtil = require("../../lib/util/number");

/**
 * See:
 *  <https://en.wikipedia.org/wiki/Box_plot#cite_note-frigge_hoaglin_iglewicz-2>
 *  <http://stat.ethz.ch/R-manual/R-devel/library/grDevices/html/boxplot.stats.html>
 *
 * Helper method for preparing data.
 *
 * @param {Array.<number>} rawData like
 *        [
 *            [12,232,443], (raw data set for the first box)
 *            [3843,5545,1232], (raw datat set for the second box)
 *            ...
 *        ]
 * @param {Object} [opt]
 *
 * @param {(number|string)} [opt.boundIQR=1.5] Data less than min bound is outlier.
 *      default 1.5, means Q1 - 1.5 * (Q3 - Q1).
 *      If 'none'/0 passed, min bound will not be used.
 * @param {(number|string)} [opt.layout='horizontal']
 *      Box plot layout, can be 'horizontal' or 'vertical'
 * @return {Object} {
 *      boxData: Array.<Array.<number>>
 *      outliers: Array.<Array.<number>>
 *      axisData: Array.<string>
 * }
 */
function _default(rawData, opt) {
  opt = opt || [];
  var boxData = [];
  var outliers = [];
  var axisData = [];
  var boundIQR = opt.boundIQR;
  var useExtreme = boundIQR === 'none' || boundIQR === 0;

  for (var i = 0; i < rawData.length; i++) {
    axisData.push(i + '');
    var ascList = numberUtil.asc(rawData[i].slice());
    var Q1 = quantile(ascList, 0.25);
    var Q2 = quantile(ascList, 0.5);
    var Q3 = quantile(ascList, 0.75);
    var min = ascList[0];
    var max = ascList[ascList.length - 1];
    var bound = (boundIQR == null ? 1.5 : boundIQR) * (Q3 - Q1);
    var low = useExtreme ? min : Math.max(min, Q1 - bound);
    var high = useExtreme ? max : Math.min(max, Q3 + bound);
    boxData.push([low, Q1, Q2, Q3, high]);

    for (var j = 0; j < ascList.length; j++) {
      var dataItem = ascList[j];

      if (dataItem < low || dataItem > high) {
        var outlier = [i, dataItem];
        opt.layout === 'vertical' && outlier.reverse();
        outliers.push(outlier);
      }
    }
  }

  return {
    boxData: boxData,
    outliers: outliers,
    axisData: axisData
  };
}

module.exports = _default;