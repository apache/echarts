/**
 * Export echarts as CommonJS module
 */
module.exports = require('./lib/echarts');

require('./lib/chart/line');
require('./lib/chart/bar');
require('./lib/chart/pie');
require('./lib/chart/scatter');
require('./lib/component/graphic');
require('./lib/component/tooltip');
require('./lib/component/axisPointer');
require('./lib/component/legendScroll');

require('./lib/component/grid');
require('./lib/component/title');

require('./lib/component/markPoint');
require('./lib/component/markLine');
require('./lib/component/markArea');
require('./lib/component/dataZoom');
require('./lib/component/toolbox');

require('zrender/lib/vml/vml');