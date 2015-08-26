define(function(require) {

    var List = require('../../data/List');
    var zrUtil = require('zrender/core/util');

    return require('../../echarts').extendComponentModel({

        type: 'dataZoom',

        depends: ['xAxis', 'yAxis'],

        init: function (option, parentModel, ecModel) {
            this.mergeDefaultAndTheme(option, ecModel);

            /**
             * @type {Object}
             * @private
             */
            this._state = {};

            this.mergeOption();
        },

        mergeOption: function (newOption) {
            var thisOption = this.option;

            newOption && zrUtil.merge(thisOption, newOption);

            // FIXME
            // 实现?
            // Disable realtime view update if canvas is not supported.
            if (!zrUtil.canvasSupported()) {
                thisOption.realtime = false;
            }

            // Init or reset zoom states.
            var state = this._state;
            var start = retrieveValue(thisOption.start, state.start, 0);
            var end = retrieveValue(thisOption.end, state.end, 100);
            // Auto reverse
            (start > end) && (end = [start, start = end][0]);
            state.start = start;
            state.end = end;

            // Overlap these arrays but not merge.
            // FIXME
            // zrUtil.merge是否有选项，决定array是否merge？
            thisOption.xAxisIndex = retrieveValue(newOption.xAxisIndex, thisOption.xAxisIndex, []);
            thisOption.yAxisIndex = retrieveValue(newOption.yAxisIndex, thisOption.yAxisIndex, []);

            // Remove thisOption.start/end for consistence when processing merge.
            // Consider this case:
            // this.thisOption has start 10 and end 80,
            // and state has start 20 and end 60,
            // and newOption has start 40 but no end (means remain end 60).
            thisOption.start = null;
            thisOption.end = null;
        },

        setStart: function (start) {
            this._state.start = start;
        },

        setEnd: function (end) {
            this._state.end = end;
        },

        setRange: function (start, end) {
            this._state.start = start;
            this._state.end = end;
        },

        defaultOption: {
            zlevel: 0,                 // 一级层叠
            z: 4,                      // 二级层叠
            show: false,
            orient: 'horizontal',      // 布局方式，默认为水平布局，可选为：
                                       // 'horizontal' ¦ 'vertical'
            // x: {number},            // 水平安放位置，默认为根据grid参数适配，可选为：
                                       // {number}（x坐标，单位px）
            // y: {number},            // 垂直安放位置，默认为根据grid参数适配，可选为：
                                       // {number}（y坐标，单位px）
            // width: {number},        // 指定宽度，横向布局时默认为根据grid参数适配
            // height: {number},       // 指定高度，纵向布局时默认为根据grid参数适配
            backgroundColor: 'rgba(0,0,0,0)',       // 背景颜色
            dataBackgroundColor: '#eee',            // 数据背景颜色
            fillerColor: 'rgba(144,197,237,0.2)',   // 填充颜色
            handleColor: 'rgba(70,130,180,0.8)',    // 手柄颜色
            handleSize: 8,
            showDetail: true,
            // xAxisIndex: [],         // 默认控制所有横向类目
            // yAxisIndex: [],         // 默认控制所有横向类目
            // start: 0,               // 默认为0
            // end: 100,               // 默认为全部 100%
            realtime: true
            // zoomLock: false         // 是否锁定选择区域大小
        }

    });

    // FIXME
    // 公用？
    /**
     * If value1 is not null, then return value1, otherwise judget rest of values.
     * @param  {*...} values
     * @return {*} Final value
     */
    function retrieveValue(values) {
        for (var i = 0, len = arguements.length; i < len; i++) {
            if (arguements[i] != null) {
                return arguements[i];
            }
        }
    }
});