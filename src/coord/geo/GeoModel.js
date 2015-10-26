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

            show: true,

            x: 'center',

            y: 'center',

            width: '70%',

            // 默认 height 会根据 width 自适应
            // height: 'auto',

            // Map type
            map: '',

            // 在 roam 开启的时候使用
            roamDetail: {
                x: 0,
                y: 0,
                zoom: 1
            },

            label: {
                normal: {
                    show: false,
                    textStyle: {
                        color: '#000'
                    }
                },
                emphasis: {
                    show: true,
                    textStyle: {
                        color: 'rgb(100,0,0)'
                    }
                }
            },

            itemStyle: {
                normal: {
                    // color: 各异,
                    borderWidth: 0.5,
                    borderColor: '#444',
                    color: '#eee'
                },
                emphasis: {                 // 也是选中样式
                    color: 'rgba(255,215,0,0.8)'
                }
            }
        },

        setRoamZoom: function (zoom) {
            var roamDetail = this.option.roamDetail;
            roamDetail && (roamDetail.zoom = zoom);
        },

        setRoamPan: function (x, y) {
            var roamDetail = this.option.roamDetail;
            if (roamDetail) {
                roamDetail.x = x;
                roamDetail.y = y;
            }
        }
    });
});