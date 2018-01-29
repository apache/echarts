
import createListSimply from '../helper/createListSimply';
import WhiskerBoxDraw from '../helper/WhiskerBoxDraw';
import * as zrUtil from 'zrender/src/core/util';
import {getDimensionTypeByAxis} from '../../data/helper/dimensionHelper';

export var seriesModelMixin = {

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

        var ordinalMeta;

        var xAxisModel = ecModel.getComponent('xAxis', this.get('xAxisIndex'));
        var yAxisModel = ecModel.getComponent('yAxis', this.get('yAxisIndex'));
        var xAxisType = xAxisModel.get('type');
        var yAxisType = yAxisModel.get('type');
        var addOrdinal;

        // FIXME
        // 考虑时间轴

        if (xAxisType === 'category') {
            option.layout = 'horizontal';
            ordinalMeta = xAxisModel.getOrdinalMeta();
            addOrdinal = true;
        }
        else if (yAxisType  === 'category') {
            option.layout = 'vertical';
            ordinalMeta = yAxisModel.getOrdinalMeta();
            addOrdinal = true;
        }
        else {
            option.layout = option.layout || 'horizontal';
        }

        var coordDims = ['x', 'y'];
        var baseAxisDimIndex = option.layout === 'horizontal' ? 0 : 1;
        var baseAxisDim = this._baseAxisDim = coordDims[baseAxisDimIndex];
        var otherAxisDim = coordDims[1 - baseAxisDimIndex];
        var axisModels = [xAxisModel, yAxisModel];
        var baseAxisType = axisModels[baseAxisDimIndex].get('type');
        var otherAxisType = axisModels[1 - baseAxisDimIndex].get('type');
        var data = option.data;

        // ??? FIXME make a stage to perform data transfrom.
        // MUST create a new data, consider setOption({}) again.
        if (data && addOrdinal) {
            var newOptionData = [];
            zrUtil.each(data, function (item, index) {
                var newItem;
                if (item.value && zrUtil.isArray(item.value)) {
                    newItem = item.value.slice();
                    item.value.unshift(index);
                }
                else if (zrUtil.isArray(item)) {
                    newItem = item.slice();
                    item.unshift(index);
                }
                else {
                    newItem = item;
                }
                newOptionData.push(newItem);
            });
            option.data = newOptionData;
        }

        var defaultValueDimensions = this.defaultValueDimensions;

        return createListSimply(
            this,
            {
                coordDimensions: [{
                    name: baseAxisDim,
                    type: getDimensionTypeByAxis(baseAxisType),
                    ordinalMeta: ordinalMeta,
                    otherDims: {
                        tooltip: false,
                        itemName: 0
                    },
                    dimsDef: ['base']
                }, {
                    name: otherAxisDim,
                    type: getDimensionTypeByAxis(otherAxisType),
                    dimsDef: defaultValueDimensions.slice()
                }],
                dimensionsCount: defaultValueDimensions.length + 1
            }
        );
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

export var viewMixin = {

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

    incrementalPrepareRender: function (seriesModel, ecModel, api) {
        this._whiskerBoxDraw.incrementalPrepareUpdate(seriesModel, ecModel, api);
    },

    incrementalRender: function (params, seriesModel, ecModel, api) {
        this._whiskerBoxDraw.incrementalUpdate(params, seriesModel, ecModel, api);
    },

    remove: function (ecModel) {
        this._whiskerBoxDraw.remove();
    }
};
