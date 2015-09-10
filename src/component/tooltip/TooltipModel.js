define(function (require) {

    require('../../echarts').extendComponentModel({

        type: 'tooltip',

        defaultOption: {
            zlevel: 1,                  // 一级层叠，频繁变化的tooltip指示器在pc上独立一层
            z: 8,                       // 二级层叠
            show: true,
            showContent: true,         // tooltip主体内容
            trigger: 'item',           // 触发类型，默认数据触发，见下图，可选为：'item' ¦ 'axis'

            // If the tooltip follow the mouse position
            // TODO
            // followMouse: true,

            // position: null          // 位置 {Array} | {Function}
            // formatter: null         // 内容格式器：{string}（Template） ¦ {Function}
            islandFormatter: '{a} <br/>{b} : {c}',  // 数据孤岛内容格式器
            showDelay: 20,             // 显示延迟，添加显示延迟可以避免频繁切换，单位ms
            hideDelay: 100,            // 隐藏延迟，单位ms
            transitionDuration: 0.4,   // 动画变换时间，单位s
            enterable: false,
            backgroundColor: 'rgba(0,0,0,0.7)',     // 提示背景颜色，默认为透明度为0.7的黑色
            borderColor: '#333',       // 提示边框颜色
            borderRadius: 4,           // 提示边框圆角，单位px，默认为4
            borderWidth: 0,            // 提示边框线宽，单位px，默认为0（无边框）
            padding: 5,                // 提示内边距，单位px，默认各方向内边距为5，
                                    // 接受数组分别设定上右下左边距，同css
            axisPointer: {             // 坐标轴指示器，坐标轴触发有效
                type: 'line',          // 默认为直线，可选为：'line' | 'shadow' | 'cross'
                lineStyle: {           // 直线指示器样式设置
                    color: '#48b',
                    width: 2,
                    type: 'solid'
                },
                crossStyle: {
                    color: '#1e90ff',
                    width: 1,
                    type: 'dashed'
                },
                shadowStyle: {                      // 阴影指示器样式设置
                    color: 'rgba(150,150,150,0.3)', // 阴影颜色
                    width: 'auto',                  // 阴影大小
                    type: 'default'
                }
            },
            textStyle: {
                color: '#fff'
            }
        }
    });
});