/**
 * Export echarts as CommonJS module
 */
module.exports = require('./src/echarts');

// Import all charts and components
require('./src/chart/line');
require('./src/chart/bar');
require('./src/chart/pie');
require('./src/chart/scatter');
require('./src/chart/radar');

require('./src/chart/map');
require('./src/chart/treemap');
require('./src/chart/graph');
require('./src/chart/gauge');
require('./src/chart/funnel');
require('./src/chart/parallel');
require('./src/chart/sankey');
require('./src/chart/boxplot');
require('./src/chart/candlestick');
require('./src/chart/effectScatter');
require('./src/chart/lines');
require('./src/chart/heatmap');
require('./src/chart/pictorialBar');
require('./src/chart/themeRiver');
require('./src/chart/custom');

require('./src/component/graphic');
require('./src/component/grid');
require('./src/component/legendScroll');
require('./src/component/tooltip');
require('./src/component/axisPointer');
require('./src/component/polar');
require('./src/component/geo');
require('./src/component/parallel');
require('./src/component/singleAxis');
require('./src/component/brush');
require('./src/component/calendar');

require('./src/component/title');

require('./src/component/dataZoom');
require('./src/component/visualMap');

require('./src/component/markPoint');
require('./src/component/markLine');
require('./src/component/markArea');

require('./src/component/timeline');
require('./src/component/toolbox');

require('zrender/lib/vml/vml');
