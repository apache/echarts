import * as zrUtil from 'zrender/src/core/util';

var defaultOption = {
    show: true,
    zlevel: 0,                  // 一级层叠
    z: 0,                       // 二级层叠
    // 反向坐标轴
    inverse: false,

    // 坐标轴名字，默认为空
    name: '',
    // 坐标轴名字位置，支持'start' | 'middle' | 'end'
    nameLocation: 'end',
    // 坐标轴名字旋转，degree。
    nameRotate: null, // Adapt to axis rotate, when nameLocation is 'middle'.
    nameTruncate: {
        maxWidth: null,
        ellipsis: '...',
        placeholder: '.'
    },
    // 坐标轴文字样式，默认取全局样式
    nameTextStyle: {},
    // 文字与轴线距离
    nameGap: 15,

    silent: false, // Default false to support tooltip.
    triggerEvent: false, // Default false to avoid legacy user event listener fail.

    tooltip: {
        show: false
    },

    axisPointer: {},

    // 坐标轴线
    axisLine: {
        // 默认显示，属性show控制显示与否
        show: true,
        onZero: true,
        onZeroAxisIndex: null,
        // 属性lineStyle控制线条样式
        lineStyle: {
            color: '#333',
            width: 1,
            type: 'solid'
        },
        // 坐标轴两端的箭头
        symbol: ['none', 'none'],
        symbolSize: [10, 15]
    },
    // 坐标轴小标记
    axisTick: {
        // 属性show控制显示与否，默认显示
        show: true,
        // 控制小标记是否在grid里
        inside: false,
        // 属性length控制线长
        length: 5,
        // 属性lineStyle控制线条样式
        lineStyle: {
            width: 1
        }
    },
    // 坐标轴文本标签，详见axis.axisLabel
    axisLabel: {
        show: true,
        // 控制文本标签是否在grid里
        inside: false,
        rotate: 0,
        showMinLabel: null, // true | false | null (auto)
        showMaxLabel: null, // true | false | null (auto)
        margin: 8,
        // formatter: null,
        // 其余属性默认使用全局文本样式，详见TEXTSTYLE
        fontSize: 12
    },
    // 分隔线
    splitLine: {
        // 默认显示，属性show控制显示与否
        show: true,
        // 属性lineStyle（详见lineStyle）控制线条样式
        lineStyle: {
            color: ['#ccc'],
            width: 1,
            type: 'solid'
        }
    },
    // 分隔区域
    splitArea: {
        // 默认不显示，属性show控制显示与否
        show: false,
        // 属性areaStyle（详见areaStyle）控制区域样式
        areaStyle: {
            color: ['rgba(250,250,250,0.3)','rgba(200,200,200,0.3)']
        }
    }
};

var axisDefault = {};

axisDefault.categoryAxis = zrUtil.merge({
    // 类目起始和结束两端空白策略
    boundaryGap: true,
    // splitArea: {
        // show: false
    // },
    splitLine: {
        show: false
    },
    // 坐标轴小标记
    axisTick: {
        // If tick is align with label when boundaryGap is true
        alignWithLabel: false,
        interval: 'auto'
    },
    // 坐标轴文本标签，详见axis.axisLabel
    axisLabel: {
        interval: 'auto'
    }
}, defaultOption);

axisDefault.valueAxis = zrUtil.merge({
    // 数值起始和结束两端空白策略
    boundaryGap: [0, 0],
    // 最小值, 设置成 'dataMin' 则从数据中计算最小值
    // min: null,
    // 最大值，设置成 'dataMax' 则从数据中计算最大值
    // max: null,
    // Readonly prop, specifies start value of the range when using data zoom.
    // rangeStart: null
    // Readonly prop, specifies end value of the range when using data zoom.
    // rangeEnd: null
    // 脱离0值比例，放大聚焦到最终_min，_max区间
    // scale: false,
    // 分割段数，默认为5
    splitNumber: 5
    // Minimum interval
    // minInterval: null
    // maxInterval: null
}, defaultOption);

// FIXME
axisDefault.timeAxis = zrUtil.defaults({
    scale: true,
    min: 'dataMin',
    max: 'dataMax'
}, axisDefault.valueAxis);

axisDefault.logAxis = zrUtil.defaults({
    scale: true,
    logBase: 10
}, axisDefault.valueAxis);

export default axisDefault;
