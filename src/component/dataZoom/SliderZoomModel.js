/**
 * @file Data zoom model
 */
define(function(require) {

    var DataZoomModel = require('./DataZoomModel');

    return DataZoomModel.extend({

        type: 'dataZoom.slider',

        /**
         * @protected
         */
        defaultOption: {
            // left: {number},         // 水平安放位置，默认为根据grid参数适配，可选为：
                                       // {number}（x坐标，单位px）
            // top: {number},          // 垂直安放位置，默认为根据grid参数适配，可选为：
                                       // {number}（y坐标，单位px）
            // width: {number},        // 指定宽度，横向布局时默认为根据grid参数适配
            // height: {number},       // 指定高度，纵向布局时默认为根据grid参数适配
            backgroundColor: 'rgba(47,69,84,0)',       // 背景颜色
            dataBackgroundColor: '#ddd',            // 数据背景颜色
            fillerColor: 'rgba(47,69,84,0.25)',   // 填充颜色
            handleColor: 'rgba(47,69,84,0.65)',    // 手柄颜色
            handleSize: 10,
            // labelPrecision: 'auto',           // label小数精度
            labelFormatter: null,
            showDetail: true,
            showDataShadow: 'auto',
            realtime: true,
            zoomLock: false,         // 是否锁定选择区域大小
            textStyle: {
                color: '#333'
            }
        }

    });

});