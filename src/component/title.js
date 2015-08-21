define(function(require) {

    'use strict';

    var echarts = require('../echarts');

    // Model
    echarts.extendComponentModel({

        type: 'title',

        defaultOption: {
            zlevel: 0,                  // 一级层叠
            z: 6,                       // 二级层叠
            show: true,
            text: '',
            // link: null,             // 超链接跳转
            // target: null,           // 仅支持self | blank
            subtext: '',
            // sublink: null,          // 超链接跳转
            // subtarget: null,        // 仅支持self | blank
            x: 'left',                 // 水平安放位置，默认为左对齐，可选为：
                                    // 'center' ¦ 'left' ¦ 'right'
                                    // ¦ {number}（x坐标，单位px）
            y: 'top',                  // 垂直安放位置，默认为全图顶端，可选为：
                                    // 'top' ¦ 'bottom' ¦ 'center'
                                    // ¦ {number}（y坐标，单位px）
            //textAlign: null          // 水平对齐方式，默认根据x设置自动调整
            backgroundColor: 'rgba(0,0,0,0)',
            borderColor: '#ccc',       // 标题边框颜色
            borderWidth: 0,            // 标题边框线宽，单位px，默认为0（无边框）
            padding: 5,                // 标题内边距，单位px，默认各方向内边距为5，
                                    // 接受数组分别设定上右下左边距，同css
            itemGap: 5,                // 主副标题纵向间隔，单位px，默认为10，
            textStyle: {
                fontSize: 18,
                fontWeight: 'bolder',
                color: '#333'          // 主标题文字颜色
            },
            subtextStyle: {
                color: '#aaa'          // 副标题文字颜色
            }
        }
    });

    // View
    echarts.extendComponentView({

        type: 'title',

        render: function (titleModel, ecModel, api) {
            
        }
    });
});