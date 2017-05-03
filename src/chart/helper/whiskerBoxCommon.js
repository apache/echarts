define(function(require) {

    'use strict';

    var List = require('../../data/List');
    var completeDimensions = require('../../data/helper/completeDimensions');
    var WhiskerBoxDraw = require('../helper/WhiskerBoxDraw');
    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../../util/model');
    var formatUtil = require('../../util/format');
    var encodeHTML = formatUtil.encodeHTML;
    var addCommas = formatUtil.addCommas;

    function getItemValue(item) {
        return item.value == null ? item : item.value;
    }

    var seriesModelMixin = {

        /**
         * @private
         * @type {string}
         */
        _baseAxisDim: null,

        /**
         * @override
         */
        getInitialData: function (option, ecModel) {
            // When both types of xAxis and yAxis are 'value', layout is
            // needed to be specified by user. Otherwise, layout can be
            // judged by which axis is category.

            var categories;

            var xAxisModel = ecModel.getComponent('xAxis', this.get('xAxisIndex'));
            var yAxisModel = ecModel.getComponent('yAxis', this.get('yAxisIndex'));
            var xAxisType = xAxisModel.get('type');
            var yAxisType = yAxisModel.get('type');
            var addOrdinal;

            // FIXME
            // 考虑时间轴

            if (xAxisType === 'category') {
                option.layout = 'horizontal';
                categories = xAxisModel.getCategories();
                addOrdinal = true;
            }
            else if (yAxisType  === 'category') {
                option.layout = 'vertical';
                categories = yAxisModel.getCategories();
                addOrdinal = true;
            }
            else {
                option.layout = option.layout || 'horizontal';
            }

            var coordDims = ['x', 'y'];
            var baseAxisDimIndex = option.layout === 'horizontal' ? 0 : 1;
            var baseAxisDim = this._baseAxisDim = coordDims[baseAxisDimIndex];
            var otherAxisDim = coordDims[1 - baseAxisDimIndex];

            var data = option.data;
            var dimensions = [{
                name: 'base',
                coordDim: baseAxisDim,
                coordDimIndex: 0
            }];
            zrUtil.each(this.defaultValueDimensions, function (dimName, index) {
                dimensions.push({
                    name: dimName,
                    coordDim: otherAxisDim,
                    coordDimIndex: index
                });
            });
            completeDimensions(dimensions, data);

            modelUtil.applyDimensionDefine(dimensions, this);

            var list = new List(dimensions, this);
            list.initData(data, categories ? categories.slice() : null, function (dataItem, dimName, idx, dimIdx) {
                var value = getItemValue(dataItem);
                return addOrdinal ? (dimName === 'base' ? idx : value[dimIdx - 1]) : value[dimIdx];
            });

            return list;
        },

        /**
         * If horizontal, base axis is x, otherwise y.
         * @override
         */
        getBaseAxis: function () {
            var dim = this._baseAxisDim;
            return this.ecModel.getComponent(dim + 'Axis', this.get(dim + 'AxisIndex')).axis;
        },

        /**
         * @override
         */
        formatTooltip: function (dataIndex, mutipleSeries) {
            // It rearly use mutiple candlestick series in one cartesian,
            // so only consider one series in this default tooltip.
            var data = this.getData();
            var dimensions = data.dimensions;
            var valueHTML = [];
            zrUtil.each(dimensions, function (dimName, index) {
                // The first dim is "base", which will not be displayed in tooltip.
                index && valueHTML.push(
                    '- ' + encodeHTML(dimName + ': ' + addCommas(data.get(dimName, dataIndex)))
                );
            });
            valueHTML = valueHTML.join('<br />');

            var html = [];
            this.name != null && html.push(encodeHTML(this.name));
            valueHTML != null && html.push(valueHTML);

            return html.join('<br />');
        }

    };

    var viewMixin = {

        init: function () {
            /**
             * Old data.
             * @private
             * @type {module:echarts/chart/helper/WhiskerBoxDraw}
             */
            var whiskerBoxDraw = this._whiskerBoxDraw = new WhiskerBoxDraw(
                this.getStyleUpdater()
            );
            this.group.add(whiskerBoxDraw.group);
        },

        render: function (seriesModel, ecModel, api) {
            this._whiskerBoxDraw.updateData(seriesModel.getData());
        },

        remove: function (ecModel) {
            this._whiskerBoxDraw.remove();
        }
    };

    return {
        seriesModelMixin: seriesModelMixin,
        viewMixin: viewMixin
    };
});