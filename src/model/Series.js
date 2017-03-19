define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var formatUtil = require('../util/format');
    var classUtil = require('../util/clazz');
    var modelUtil = require('../util/model');
    var ComponentModel = require('./Component');
    var colorPaletteMixin = require('./mixin/colorPalette');
    var env = require('zrender/core/env');
    var layout = require('../util/layout');

    var set = classUtil.set;
    var get = classUtil.get;
    var encodeHTML = formatUtil.encodeHTML;
    var addCommas = formatUtil.addCommas;

    var SeriesModel = ComponentModel.extend({

        type: 'series.__base__',

        /**
         * @readOnly
         */
        seriesIndex: 0,

        // coodinateSystem will be injected in the echarts/CoordinateSystem
        coordinateSystem: null,

        /**
         * @type {Object}
         * @protected
         */
        defaultOption: null,

        /**
         * Data provided for legend
         * @type {Function}
         */
        // PENDING
        legendDataProvider: null,

        /**
         * Access path of color for visual
         */
        visualColorAccessPath: 'itemStyle.normal.color',

        /**
         * Support merge layout params.
         * Only support 'box' now (left/right/top/bottom/width/height).
         * @type {string|Object} Object can be {ignoreSize: true}
         * @readOnly
         */
        layoutMode: null,

        init: function (option, parentModel, ecModel, extraOpt) {

            /**
             * @type {number}
             * @readOnly
             */
            this.seriesIndex = this.componentIndex;

            this.mergeDefaultAndTheme(option, ecModel);

            var data = this.getInitialData(option, ecModel);
            if (__DEV__) {
                zrUtil.assert(data, 'getInitialData returned invalid data.');
            }
            /**
             * @type {module:echarts/data/List|module:echarts/data/Tree|module:echarts/data/Graph}
             * @private
             */
            set(this, 'dataBeforeProcessed', data);

            // If we reverse the order (make data firstly, and then make
            // dataBeforeProcessed by cloneShallow), cloneShallow will
            // cause data.graph.data !== data when using
            // module:echarts/data/Graph or module:echarts/data/Tree.
            // See module:echarts/data/helper/linkList
            this.restoreData();
        },

        /**
         * Util for merge default and theme to option
         * @param  {Object} option
         * @param  {module:echarts/model/Global} ecModel
         */
        mergeDefaultAndTheme: function (option, ecModel) {
            var layoutMode = this.layoutMode;
            var inputPositionParams = layoutMode
                ? layout.getLayoutParams(option) : {};

            zrUtil.merge(
                option,
                ecModel.getTheme().get(this.subType)
            );
            zrUtil.merge(option, this.getDefaultOption());

            // Default label emphasis `position` and `show`
            // FIXME Set label in mergeOption
            modelUtil.defaultEmphasis(option.label, modelUtil.LABEL_OPTIONS);

            this.fillDataTextStyle(option.data);

            if (layoutMode) {
                layout.mergeLayoutParam(option, inputPositionParams, layoutMode);
            }
        },

        mergeOption: function (newSeriesOption, ecModel) {
            newSeriesOption = zrUtil.merge(this.option, newSeriesOption, true);
            this.fillDataTextStyle(newSeriesOption.data);

            var layoutMode = this.layoutMode;
            if (layoutMode) {
                layout.mergeLayoutParam(this.option, newSeriesOption, layoutMode);
            }

            var data = this.getInitialData(newSeriesOption, ecModel);
            // TODO Merge data?
            if (data) {
                set(this, 'data', data);
                set(this, 'dataBeforeProcessed', data.cloneShallow());
            }
        },

        fillDataTextStyle: function (data) {
            // Default data label emphasis `position` and `show`
            // FIXME Tree structure data ?
            // FIXME Performance ?
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    if (data[i] && data[i].label) {
                        modelUtil.defaultEmphasis(data[i].label, modelUtil.LABEL_OPTIONS);
                    }
                }
            }
        },

        /**
         * Init a data structure from data related option in series
         * Must be overwritten
         */
        getInitialData: function () {},

        /**
         * @param {string} [dataType]
         * @return {module:echarts/data/List}
         */
        getData: function (dataType) {
            var data = get(this, 'data');
            return dataType == null ? data : data.getLinkedData(dataType);
        },

        /**
         * @param {module:echarts/data/List} data
         */
        setData: function (data) {
            set(this, 'data', data);
        },

        /**
         * Get data before processed
         * @return {module:echarts/data/List}
         */
        getRawData: function () {
            return get(this, 'dataBeforeProcessed');
        },

        /**
         * Coord dimension to data dimension.
         *
         * By default the result is the same as dimensions of series data.
         * But in some series data dimensions are different from coord dimensions (i.e.
         * candlestick and boxplot). Override this method to handle those cases.
         *
         * Coord dimension to data dimension can be one-to-many
         *
         * @param {string} coordDim
         * @return {Array.<string>} dimensions on the axis.
         */
        coordDimToDataDim: function (coordDim) {
            return [coordDim];
        },

        /**
         * Convert data dimension to coord dimension.
         *
         * @param {string|number} dataDim
         * @return {string}
         */
        dataDimToCoordDim: function (dataDim) {
            return dataDim;
        },

        /**
         * Get base axis if has coordinate system and has axis.
         * By default use coordSys.getBaseAxis();
         * Can be overrided for some chart.
         * @return {type} description
         */
        getBaseAxis: function () {
            var coordSys = this.coordinateSystem;
            return coordSys && coordSys.getBaseAxis && coordSys.getBaseAxis();
        },

        // FIXME
        /**
         * Default tooltip formatter
         *
         * @param {number} dataIndex
         * @param {boolean} [multipleSeries=false]
         * @param {number} [dataType]
         */
        formatTooltip: function (dataIndex, multipleSeries, dataType) {
            function formatArrayValue(value) {
                var result = [];

                zrUtil.each(value, function (val, idx) {
                    var dimInfo = data.getDimensionInfo(idx);
                    var dimType = dimInfo && dimInfo.type;
                    var valStr;

                    if (dimType === 'ordinal') {
                        valStr = val + '';
                    }
                    else if (dimType === 'time') {
                        valStr = multipleSeries ? '' : formatUtil.formatTime('yyyy/MM/dd hh:mm:ss', val);
                    }
                    else {
                        valStr = addCommas(val);
                    }

                    valStr && result.push(valStr);
                });

                return result.join(', ');
            }

            var data = get(this, 'data');

            var value = this.getRawValue(dataIndex);
            var formattedValue = encodeHTML(
                zrUtil.isArray(value) ? formatArrayValue(value) : addCommas(value)
            );
            var name = data.getName(dataIndex);

            var color = data.getItemVisual(dataIndex, 'color');
            if (zrUtil.isObject(color) && color.colorStops) {
                color = (color.colorStops[0] || {}).color;
            }
            color = color || 'transparent';

            var colorEl = '<span style="display:inline-block;margin-right:5px;'
                + 'border-radius:10px;width:9px;height:9px;background-color:' + encodeHTML(color) + '"></span>';

            var seriesName = this.name;
            // FIXME
            if (seriesName === '\0-') {
                // Not show '-'
                seriesName = '';
            }
            return !multipleSeries
                ? ((seriesName && encodeHTML(seriesName) + '<br />') + colorEl
                    + (name
                        ? encodeHTML(name) + ' : ' + formattedValue
                        : formattedValue
                    )
                  )
                : (colorEl + encodeHTML(this.name) + ' : ' + formattedValue);
        },

        /**
         * @return {boolean}
         */
        isAnimationEnabled: function () {
            if (env.node) {
                return false;
            }

            var animationEnabled = this.getShallow('animation');
            if (animationEnabled) {
                if (this.getData().count() > this.getShallow('animationThreshold')) {
                    animationEnabled = false;
                }
            }
            return animationEnabled;
        },

        restoreData: function () {
            set(this, 'data', get(this, 'dataBeforeProcessed').cloneShallow());
        },

        getColorFromPalette: function (name, scope) {
            var ecModel = this.ecModel;
            // PENDING
            var color = colorPaletteMixin.getColorFromPalette.call(this, name, scope);
            if (!color) {
                color = ecModel.getColorFromPalette(name, scope);
            }
            return color;
        },

        /**
         * Get data indices for show tooltip content. See tooltip.
         * @abstract
         * @param {Array.<string>|string} dim
         * @param {Array.<number>} value
         * @param {module:echarts/coord/single/SingleAxis} baseAxis
         * @return {Object} {dataIndices, nestestValue}.
         */
        getAxisTooltipData: null,

        /**
         * See tooltip.
         * @abstract
         * @param {number} dataIndex
         * @return {Array.<number>} Point of tooltip. null/undefined can be returned.
         */
        getTooltipPosition: null
    });

    zrUtil.mixin(SeriesModel, modelUtil.dataFormatMixin);
    zrUtil.mixin(SeriesModel, colorPaletteMixin);

    return SeriesModel;
});