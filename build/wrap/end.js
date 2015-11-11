var echarts = require('echarts');

echarts.graphic = require('echarts/util/graphic');
echarts.number = require('echarts/util/number');
echarts.format = require('echarts/util/format');

/** for: ${parts} as ${mod} */
require("${mod}");
/** /for */
_global['echarts'] = echarts;
})(window);
