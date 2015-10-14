define(function (require) {

    var List = require('../../data/List');

    var echarts = require('../../echarts');

    function fillData(dataOpt, geoJson) {
        var dataNameMap = {};
        var features = geoJson.features;
        for (var i = 0; i < dataOpt.length; i++) {
            dataNameMap[dataOpt[i].name] = dataOpt[i];
        }

        for (var i = 0; i < features.length; i++) {
            var name = features[i].properties.name;
            if (!dataNameMap[name]) {
                dataOpt.push({
                    value: NaN,
                    name: name
                });
            }
        }
        return dataOpt;
    }

    return echarts.extendSeriesModel({

        type: 'series.map',

        getInitialData: function (option) {
            var list = new List([{
                name: 'value'
            }], this);

            var geoJson = echarts.getMap(option.mapType);

            var dataOpt = option.data || [];

            // https://jsperf.com/try-catch-performance-overhead
            if (geoJson) {
                try {
                    dataOpt = fillData(dataOpt, geoJson);
                }
                catch (e) {
                    throw 'Invalid geoJson format\n' + e;
                }
            }
            list.initData(dataOpt);

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
            // 显示图例颜色标识（系列标识的小圆点）
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
                            color: '#000'
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
                            color: '#000'
                        }
                    }
                }
            }
        }
    })
});