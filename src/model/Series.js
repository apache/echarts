import {__DEV__} from '../config';
import * as zrUtil from 'zrender/src/core/util';
import env from 'zrender/src/core/env';
import {
    formatTime,
    encodeHTML,
    addCommas,
    getTooltipMarker
} from '../util/format';
import * as modelUtil from '../util/model';
import ComponentModel from './Component';
import colorPaletteMixin from './mixin/colorPalette';
import {
    getLayoutParams,
    mergeLayoutParam
} from '../util/layout';
import {createTask} from '../stream/task';
import {
    prepareSource,
    getSource
} from '../data/helper/sourceHelper';

var inner = modelUtil.makeInner();

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
    visualColorAccessPath: 'itemStyle.color',

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

        // this.settingTask = createTask();

        this.dataTask = createTask({
            count: dataTaskCount,
            reset: dataTaskReset
        }, {model: this});

        this.mergeDefaultAndTheme(option, ecModel);

        prepareSource(this);


        var data = this.getInitialData(option, ecModel);

        if (__DEV__) {
            zrUtil.assert(data, 'getInitialData returned invalid data.');
        }

        /**
         * @type {module:echarts/data/List|module:echarts/data/Tree|module:echarts/data/Graph}
         * @private
         */
        inner(this).dataBeforeProcessed = data;

        // If we reverse the order (make data firstly, and then make
        // dataBeforeProcessed by cloneShallow), cloneShallow will
        // cause data.graph.data !== data when using
        // module:echarts/data/Graph or module:echarts/data/Tree.
        // See module:echarts/data/helper/linkList

        // Theoretically, it is unreasonable to call `seriesModel.getData()` in the model
        // init or merge stage, because the data can be restored. So we do not `restoreData`
        // and `setData` here, which forbids calling `seriesModel.getData()` in this stage.
        // Call `seriesModel.getRawData()` instead.
        // this.restoreData();

        autoSeriesName(this);
    },

    /**
     * Util for merge default and theme to option
     * @param  {Object} option
     * @param  {module:echarts/model/Global} ecModel
     */
    mergeDefaultAndTheme: function (option, ecModel) {
        var layoutMode = this.layoutMode;
        var inputPositionParams = layoutMode
            ? getLayoutParams(option) : {};

        // Backward compat: using subType on theme.
        // But if name duplicate between series subType
        // (for example: parallel) add component mainType,
        // add suffix 'Series'.
        var themeSubType = this.subType;
        if (ComponentModel.hasClass(themeSubType)) {
            themeSubType += 'Series';
        }
        zrUtil.merge(
            option,
            ecModel.getTheme().get(this.subType)
        );
        zrUtil.merge(option, this.getDefaultOption());

        // Default label emphasis `show`
        modelUtil.defaultEmphasis(option, 'label', ['show']);

        this.fillDataTextStyle(option.data);

        if (layoutMode) {
            mergeLayoutParam(option, inputPositionParams, layoutMode);
        }
    },

    mergeOption: function (newSeriesOption, ecModel) {
        // this.settingTask.dirty();

        newSeriesOption = zrUtil.merge(this.option, newSeriesOption, true);
        this.fillDataTextStyle(newSeriesOption.data);

        var layoutMode = this.layoutMode;
        if (layoutMode) {
            mergeLayoutParam(this.option, newSeriesOption, layoutMode);
        }

        prepareSource(this);

        var data = this.getInitialData(newSeriesOption, ecModel);
        // ??? set dirty on ecModel, becusue it will call mergeOption({})?
        this.dataTask.dirty();

        inner(this).dataBeforeProcessed = data;

        autoSeriesName(this);
    },

    fillDataTextStyle: function (data) {
        // Default data label emphasis `show`
        // FIXME Tree structure data ?
        // FIXME Performance ?
        if (data) {
            var props = ['show'];
            for (var i = 0; i < data.length; i++) {
                if (data[i] && data[i].label) {
                    modelUtil.defaultEmphasis(data[i], 'label', props);
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
     * Append data to list
     * @param {Object} params
     * @param {Array|TypedArray} params.data
     */
    appendData: function (params) {
        // FIXME ???
        // (1) If data from dataset, forbidden append.
        // (2) support append data of dataset.
        var data = this.getRawData();
        data.appendData(params.data);
    },

    /**
     * @param {string} [dataType]
     * @return {module:echarts/data/List}
     */
    getData: function (dataType) {
        var data = inner(this).data;
        return dataType == null ? data : data.getLinkedData(dataType);
    },

    /**
     * @param {module:echarts/data/List} data
     */
    setData: function (data) {
        inner(this).data = data;
    },

    /**
     * @see {module:echarts/data/helper/sourceHelper#getSource}
     * @return {module:echarts/data/Source} source
     */
    getSource: function () {
        return getSource(this);
    },

    /**
     * Get data before processed
     * @return {module:echarts/data/List}
     */
    getRawData: function () {
        return inner(this).dataBeforeProcessed;
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
            // ???
            // check: category-no-encode-has-axis-data in dataset.html
            var vertially = zrUtil.reduce(value, function (vertially, val, idx) {
                var dimItem = data.getDimensionInfo(idx);
                return vertially |= dimItem && dimItem.tooltip !== false && dimItem.tooltipName != null;
            }, 0);

            var result = [];
            var tooltipDims = data.mapDimension('tooltip', true);

            tooltipDims.length
                ? zrUtil.each(tooltipDims, function (dimIdx) {
                    setEachItem(data.get(dimIdx, dataIndex), dimIdx);
                })
                // By default, all dims is used on tooltip.
                : zrUtil.each(value, setEachItem);

            function setEachItem(val, dimIdx) {
                var dimInfo = data.getDimensionInfo(dimIdx);
                // If `dimInfo.tooltip` is not set, show tooltip.
                if (!dimInfo || dimInfo.otherDims.tooltip === false) {
                    return;
                }
                var dimType = dimInfo.type;
                var valStr = (vertially ? '- ' + (dimInfo.tooltipName || dimInfo.name) + ': ' : '')
                    + (dimType === 'ordinal'
                        ? val + ''
                        : dimType === 'time'
                        ? (multipleSeries ? '' : formatTime('yyyy/MM/dd hh:mm:ss', val))
                        : addCommas(val)
                    );
                valStr && result.push(encodeHTML(valStr));
            }

            return (vertially ? '<br/>' : '') + result.join(vertially ? '<br/>' : ', ');
        }

        var data = inner(this).data;

        var value = this.getRawValue(dataIndex);
        var formattedValue = zrUtil.isArray(value)
            ? formatArrayValue(value) : encodeHTML(addCommas(value));
        var name = data.getName(dataIndex);

        var color = data.getItemVisual(dataIndex, 'color');
        if (zrUtil.isObject(color) && color.colorStops) {
            color = (color.colorStops[0] || {}).color;
        }
        color = color || 'transparent';

        var colorEl = getTooltipMarker(color);

        var seriesName = this.name;
        // FIXME
        if (seriesName === '\0-') {
            // Not show '-'
            seriesName = '';
        }
        seriesName = seriesName
            ? encodeHTML(seriesName) + (!multipleSeries ? '<br/>' : ': ')
            : '';
        return !multipleSeries
            ? seriesName + colorEl
                + (name
                    ? encodeHTML(name) + ': ' + formattedValue
                    : formattedValue
                )
            : colorEl + seriesName + formattedValue;
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
        this.dataTask.dirty();
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
     * Use `data.mapDimension(coordDim, true)` instead.
     * @deprecated
     */
    coordDimToDataDim: function (coordDim) {
        return this.getRawData().mapDimension(coordDim, true);
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
    getTooltipPosition: null,

    /**
     * @see {module:echarts/stream/Scheduler}
     */
    pipeTask: null,

    /**
     * Convinient for override in extended class.
     * @protected
     * @type {Function}
     */
    preventIncremental: null,

    /**
     * @public
     * @readOnly
     * @type {Object}
     */
    pipelineContext: null

});

zrUtil.mixin(SeriesModel, modelUtil.dataFormatMixin);
zrUtil.mixin(SeriesModel, colorPaletteMixin);

/**
 * MUST be called after `prepareSource` called
 * Here we need to make auto series, especially for auto legend. But we
 * do not modify series.name in option to avoid side effects.
 */
function autoSeriesName(seriesModel) {
    // User specified name has higher priority, otherwise it may cause
    // series can not be queried unexpectedly.
    var name = seriesModel.name;
    if (modelUtil.DEFAULT_COMPONENT_NAME === name) {
        seriesModel.name = getSeriesAutoName(seriesModel) || name;
    }
}

function getSeriesAutoName(seriesModel) {
    var data = seriesModel.getRawData();
    var dataDims = data.mapDimension('seriesName', true);
    var nameArr = [];
    zrUtil.each(dataDims, function (dataDim) {
        var dimInfo = data.getDimensionInfo(dataDim);
        dimInfo.name && nameArr.push(dimInfo.name);
    });
    return nameArr.join(' ');
}

function dataTaskCount(context) {
    return context.model.getRawData().count();
}

function dataTaskReset(context) {
    var seriesModel = context.model;
    seriesModel.setData(context.outputData = seriesModel.getRawData().cloneShallow());
    return dataTaskProgress;
}

function dataTaskProgress(param, context) {
    // Avoid repead cloneShallow when data just created in reset.
    if (param.end > context.outputData.count()) {
        context.model.getRawData().cloneShallow(context.outputData);
    }
}

export default SeriesModel;
