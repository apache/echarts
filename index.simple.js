var _echarts = require("./lib/echarts");

require("./lib/chart/line");

require("./lib/chart/bar");

require("./lib/chart/pie");

require("./lib/component/gridSimple");


(function () {
  for (var key in _echarts) {
    if (_echarts == null || !_echarts.hasOwnProperty(key) || key === 'default' || key === '__esModule') return;
    exports[key] = _echarts[key];
  }
})();