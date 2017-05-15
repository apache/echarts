define(function(require) {

    'use strict';

    var List = require('../../data/List');
    var completeDimensions = require('../../data/helper/completeDimensions');
    var WhiskerBoxDraw = require('../helper/WhiskerBoxDraw');
    var zrUtil = require('zrender/core/util');

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

            addOrdinal && zrUtil.each(data, function (item, index) {
                zrUtil.isArray(item) && item.unshift(index);
            });

            var dimensions = [{
                name: baseAxisDim,
                otherDims: {
                    tooltip: false
                },
                dimsDef: ['base']
            }, {
                name: otherAxisDim,
                dimsDef: this.defaultValueDimensions.slice()
            }];

            dimensions = completeDimensions(dimensions, data, {
                encodeDef: this.get('encode'),
                dimsDef: this.get('dimensions')
            });

            var list = new List(dimensions, this);
            list.initData(data, categories ? categories.slice() : null);

            return list;
        },

        /**
         * If horizontal, base axis is x, otherwise y.
         * @override
         */
        getBaseAxis: function () {
            var dim = this._baseAxisDim;
            return this.ecModel.getComponent(dim + 'Axis', this.get(dim + 'AxisIndex')).axis;
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