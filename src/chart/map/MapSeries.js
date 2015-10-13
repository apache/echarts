define(function (require) {

    // var SeriesModel = require('../../model/Series');

    var List = require('../../data/List');

    return require('../../echarts').extendSeriesModel({

        type: 'series.map',

        getInitialData: function (option) {
            var list = new List([{
                name: 'value'
            }], this);

            list.initData(option.data);

            return list;
        },

        defaultOption: {
            // 一级层叠
            zlevel: 0,
            // 二级层叠
            z: 2,
            coordinateSystem: 'geo',
            // 各省的mapType暂时都用中文
            mapType: 'china',
            mapLocation: {
                // 'center' | 'left' | 'right' | 'x%' | {number}
                x: 'center',
                // 'center' | 'top' | 'bottom' | 'x%' | {number}
                y: 'center',
                width: '60%'    // 自适应
                // height   // 自适应
            },
            // 数值合并方式，默认加和，可选为：
            // 'sum' | 'average' | 'max' | 'min'
            // mapValueCalculation: 'sum',
            // 地图数值计算结果小数精度
            // mapValuePrecision: 0,
            // 显示图例颜色标识（系列标识的小圆点），存在legend时生效
            showLegendSymbol: true,
            // 选择模式，默认关闭，可选single，multiple
            // selectedMode: false,
            dataRangeHoverLink: true,
            hoverable: true,
            clickable: true,
            // 是否开启缩放及漫游模式
            // roam: false,
            // scaleLimit: null,
            itemStyle: {
                normal: {
                    // color: 各异,
                    borderWidth: 0,
                    areaStyle: {
                        color: '#ccc'
                    },
                    label: {
                        show: false,
                        textStyle: {
                            color: 'rgb(139,69,19)'
                        }
                    }
                },
                // 也是选中样式
                emphasis: {
                    // color: 各异,
                    borderWidth: 0,
                    areaStyle: {
                        color: 'rgba(255,215,0,0.8)'
                    },
                    label: {
                        show: false,
                        textStyle: {
                            color: 'rgb(100,0,0)'
                        }
                    }
                }
            }
        }
    })
});