define(function (require) {

    'use strict';
    var modelUtil = require('../../util/model');
    var ComponentModel = require('../../model/Component');

    ComponentModel.extend({

        type: 'geo',

        /**
         * @type {module:echarts/coord/geo/Geo}
         */
        coordinateSystem: null,

        init: function (option) {
            ComponentModel.prototype.init.apply(this, arguments);

            // Default label emphasis `position` and `show`
            modelUtil.defaultEmphasis(
                option.label, ['position', 'show', 'textStyle', 'distance', 'formatter']
            );
        },

        defaultOption: {

            zlevel: 0,

            z: 0,

            show: true,

            left: 'center',

            top: 'center',

            // 自适应
            // width:,
            // height:,
            // right
            // bottom

            // Map type
            map: '',

            // Default on center of map
            center: null,

            zoom: 1,

            scaleLimit: null,

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

        /**
         * Format label
         * @param {string} name Region name
         * @param {string} [status='normal'] 'normal' or 'emphasis'
         * @return {string}
         */
        getFormattedLabel: function (name, status) {
            var formatter = this.get('label.' + status + '.formatter');
            var params = {
                name: name
            };
            if (typeof formatter === 'function') {
                params.status = status;
                return formatter(params);
            }
            else if (typeof formatter === 'string') {
                return formatter.replace('{a}', params.seriesName);
            }
        },

        setZoom: function (zoom) {
            this.option.zoom = zoom;
        },

        setCenter: function (center) {
            this.option.center = center;
        }
    });
});