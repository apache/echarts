define(function (require) {

    'use strict';

    require('../../echarts').extendComponentModel({

        type: 'geo',

        /**
         * @type {module:echarts/coord/geo/Geo}
         */
        coordinateSystem: null,

        defaultOption: {

            zlevel: 0,

            z: 0,

            x: 'center',

            y: 'center',

            width: '70%',

            // 默认 height 会根据 width 自适应
            // height: 'auto',

            // Map type
            map: '',

            itemStyle: {
                normal: {
                    // color: 各异,
                    borderWidth: 0.5,
                    borderColor: '#444',
                    color: '#eee',
                    label: {
                        show: false,
                        textStyle: {
                            color: 'rgb(139,69,19)'
                        }
                    }
                },
                emphasis: {                 // 也是选中样式
                    color: 'rgba(255,215,0,0.8)',
                    label: {
                        show: false,
                        textStyle: {
                            color: 'rgb(100,0,0)'
                        }
                    }
                }
            }
        }
    });
});