/**
 * Export echarts as CommonJS module
 */
module.exports = require('./src/echarts');

require('./src/chart/line');
require('./src/chart/bar');
require('./src/chart/pie');
require('./src/chart/scatter');
require('./src/component/graphic');
require('./src/component/tooltip');
require('./src/component/axisPointer');
require('./src/component/legendScroll');

require('./src/component/grid');
require('./src/component/title');

require('./src/component/markPoint');
require('./src/component/markLine');
require('./src/component/markArea');
require('./src/component/dataZoom');
require('./src/component/toolbox');

require('zrender/lib/vml/vml');