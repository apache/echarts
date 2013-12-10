
var zrender = require('zrender');
zrender.tool = {
    color : require('zrender/tool/color'),
    math : require('zrender/tool/math'),
    util : require('zrender/tool/util'),
    vector : require('zrender/tool/vector'),
    area : require('zrender/tool/area'),
    event : require('zrender/tool/event')
}

zrender.animation = {
    Animation : require('zrender/animation/animation'),
    Cip : require('zrender/animation/clip'),
    easing : require('zrender/animation/easing')
}
// 加载需要的图表，由build.js临时生成
var chart = require('_chart');

_global['echarts'] = require("echarts");
_global['zrender'] = zrender;

})(window);
