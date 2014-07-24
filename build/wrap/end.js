
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
    Animation : require('zrender/animation/Animation'),
    Cip : require('zrender/animation/Clip'),
    easing : require('zrender/animation/easing')
}
var echarts = require('echarts');
echarts.config = require('echarts/config');
echarts.util = {};

// 加载需要的图表，由build.js临时生成
var chart = require('_chart');

_global['echarts'] = echarts;
_global['zrender'] = zrender;

})(window);
