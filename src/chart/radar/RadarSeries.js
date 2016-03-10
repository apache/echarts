define(function(require) {

    'use strict';

    var SeriesModel = require('../../model/Series');
    var List = require('../../data/List');
    var completeDimensions = require('../../data/helper/completeDimensions');
    var zrUtil = require('zrender/core/util');
    var formatUtil = require('../../util/format');

    var RadarSeries = SeriesModel.extend({

        type: 'series.radar',

        dependencies: ['radar'],


        // Overwrite
        init: function (option) {
            RadarSeries.superApply(this, 'init', arguments);

            // Enable legend selection for each data item
            // Use a function instead of direct access because data reference may changed
            this.legendDataProvider = function () {
                return this._dataBeforeProcessed;
            };
        },

        getInitialData: function (option, ecModel) {
            var data = option.data || [];
            var dimensions = completeDimensions(
                [], data, [], 'indicator_'
            );
            var list = new List(dimensions, this);
            list.initData(data);
            return list;
        },

        formatTooltip: function (dataIndex) {
            var value = this.getRawValue(dataIndex);
            var coordSys = this.coordinateSystem;
            var indicatorAxes = coordSys.getIndicatorAxes();
            return this._data.getName(dataIndex) + '<br />'
                + zrUtil.map(indicatorAxes, function (axis, idx) {
                    return axis.name + ' : ' + value[idx];
                }).join('<br />');
        },

        getFormattedLabel: function (dataIndex, status, formatter, indicatorIndex) {
            status = status || 'normal';
            var data = this.getData();
            var itemModel = data.getItemModel(dataIndex);

            var params = this.getDataParams(dataIndex);
            if (formatter == null) {
                formatter = itemModel.get(['label', status, 'formatter']);
            }
            // Get value of specified indicator
            params.value = params.value[indicatorIndex || 0];
            if (typeof formatter === 'function') {
                params.status = status;
                return formatter(params);
            }
            else if (typeof formatter === 'string') {
                return formatUtil.formatTpl(formatter, params);
            }
        },

        defaultOption: {
            zlevel: 0,
            z: 2,
            coordinateSystem: 'radar',
            legendHoverLink: true,
            radarIndex: 0,
            lineStyle: {
                normal: {
                    width: 2,
                    type: 'solid'
                }
            },
            label: {
                normal: {
                    position: 'top'
                }
            },
            // areaStyle: {
            // },
            // itemStyle: {}
            symbol: 'emptyCircle',
            symbolSize: 4
            // symbolRotate: null
        }
    });

    return RadarSeries;
});