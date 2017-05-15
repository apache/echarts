define(function (require) {

    var echarts = require('../echarts');
    var zrUtil = require('zrender/core/util');
    var graphicUtil = require('../util/graphic');
    var labelHelper = require('./helper/labelHelper');
    var createListFromArray = require('./helper/createListFromArray');
    var barGrid = require('../layout/barGrid');

    var ITEM_STYLE_NORMAL_PATH = ['itemStyle', 'normal'];
    var ITEM_STYLE_EMPHASIS_PATH = ['itemStyle', 'emphasis'];
    var LABEL_NORMAL = ['label', 'normal'];
    var LABEL_EMPHASIS = ['label', 'emphasis'];

    /**
     * To reduce total package size of each coordinate systems, the modules `prepareCustom`
     * of each coordinate systems are not required by each coordinate systems directly, but
     * required by the module `custom`.
     *
     * prepareInfoForCustomSeries {Function}: optional
     *     @return {Object} {coordSys: {...}, api: {
     *         coord: function (data, clamp) {}, // return point in global.
     *         size: function (dataSize, dataItem) {} // return size of each axis in coordSys.
     *     }}
     */
    var prepareCustoms = {
        cartesian2d: require('../coord/cartesian/prepareCustom'),
        geo: require('../coord/geo/prepareCustom'),
        singleAxis: require('../coord/single/prepareCustom'),
        polar: require('../coord/polar/prepareCustom'),
        calendar: require('../coord/calendar/prepareCustom')
    };

    // ------
    // Model
    // ------

    echarts.extendSeriesModel({

        type: 'series.custom',

        dependencies: ['grid', 'polar', 'geo', 'singleAxis', 'calendar'],

        defaultOption: {
            coordinateSystem: 'cartesian2d',
            zlevel: 0,
            z: 2,
            legendHoverLink: true

            // Cartesian coordinate system
            // xAxisIndex: 0,
            // yAxisIndex: 0,

            // Polar coordinate system
            // polarIndex: 0,

            // Geo coordinate system
            // geoIndex: 0,

            // label: {}
            // itemStyle: {}
        },

        getInitialData: function (option, ecModel) {
            return createListFromArray(option.data, this, ecModel);
        }
    });

    // -----
    // View
    // -----

    echarts.extendChartView({

        type: 'custom',

        /**
         * @private
         * @type {module:echarts/data/List}
         */
        _data: null,

        /**
         * @override
         */
        render: function (customSeries, ecModel, api) {
            var oldData = this._data;
            var data = customSeries.getData();
            var group = this.group;
            var renderItem = makeRenderItem(customSeries, data, ecModel, api);

            data.diff(oldData)
                .add(function (newIdx) {
                    data.hasValue(newIdx) && createOrUpdate(
                        null, newIdx, renderItem(newIdx), customSeries, group, data
                    );
                })
                .update(function (newIdx, oldIdx) {
                    var el = oldData.getItemGraphicEl(oldIdx);
                    data.hasValue(newIdx)
                        ? createOrUpdate(
                            el, newIdx, renderItem(newIdx), customSeries, group, data
                        )
                        : (el && group.remove(el));
                })
                .remove(function (oldIdx) {
                    var el = oldData.getItemGraphicEl(oldIdx);
                    el && group.remove(el);
                })
                .execute();

            this._data = data;
        }
    });


    function createEl(elOption) {
        var graphicType = elOption.type;

        var Clz = graphicUtil[graphicType.charAt(0).toUpperCase() + graphicType.slice(1)];

        if (__DEV__) {
            zrUtil.assert(Clz, 'graphic type "' + graphicType + '" can not be found.');
        }

        var el = new Clz();
        el.__customGraphicType = graphicType;

        return el;
    }

    function updateEl(el, dataIndex, elOption, animatableModel, data, isInit) {
        var targetProps = {};

        elOption.shape && (targetProps.shape = zrUtil.clone(elOption.shape));
        elOption.position && (targetProps.position = elOption.position.slice());
        elOption.scale && (targetProps.scale = elOption.scale.slice());
        elOption.origin && (targetProps.origin = elOption.origin.slice());
        elOption.rotation && (targetProps.rotation = elOption.rotation);

        if (isInit) {
            el.attr(targetProps);
        }
        else {
            graphicUtil.updateProps(el, targetProps, animatableModel, dataIndex);
        }

        if (el.type !== 'group') {
            var elOptionStyle = elOption.style || {};
            el.useStyle(elOptionStyle);

            // Init animation.
            if (isInit) {
                el.style.opacity = 0;
                var targetOpacity = elOptionStyle.opacity;
                targetOpacity == null && (targetOpacity = 1);
                graphicUtil.initProps(el, {style: {opacity: targetOpacity}}, animatableModel, dataIndex);
            }
        }

        el.type === 'image' && el.attr('image', elOption.image);
        // z2 must not be null/undefined, otherwise sort error may occur.
        el.attr({z2: elOption.z2 || 0, silent: elOption.silent});

        el.styleEmphasis !== false && graphicUtil.setHoverStyle(el, el.styleEmphasis);
    }

    function makeRenderItem(customSeries, data, ecModel, api) {
        var renderItem = customSeries.get('renderItem');
        var coordSys = customSeries.coordinateSystem;

        if (__DEV__) {
            zrUtil.assert(renderItem, 'series.render is required.');
            zrUtil.assert(prepareCustoms[coordSys.type], 'This coordSys does not support custom series.');
        }

        var prepareResult = prepareCustoms[coordSys.type](coordSys);

        var userAPI = zrUtil.defaults({
            getWidth: api.getWidth,
            getHeight: api.getHeight,
            getZr: api.getZr,
            getDevicePixelRatio: api.getDevicePixelRatio,
            value: value,
            style: style,
            styleEmphasis: styleEmphasis,
            visual: visual,
            barLayout: barLayout,
            currentSeriesIndices: currentSeriesIndices
        }, prepareResult.api);

        var userParams = {
            context: {},
            seriesId: customSeries.id,
            seriesName: customSeries.name,
            seriesIndex: customSeries.seriesIndex,
            coordSys: prepareResult.coordSys,
            dataLength: data.count(),
            encode: wrapEncodeDef(customSeries.getData())
        };

        // Do not support call `api` asynchronously without dataIndexInside input.
        var currDataIndexInside;
        var currDirty = true;
        var currItemModel;
        var currLabelNormalModel;
        var currLabelEmphasisModel;
        var currLabelValueDim;
        var currVisualColor;

        return function (dataIndexInside) {
            currDataIndexInside = dataIndexInside;
            currDirty = true;
            return renderItem && renderItem(
                zrUtil.defaults({
                    dataIndexInside: dataIndexInside,
                    dataIndex: data.getRawIndex(dataIndexInside)
                }, userParams),
                userAPI
            ) || {};
        };

        // Do not update cache until api called.
        function updateCache(dataIndexInside) {
            dataIndexInside == null && (dataIndexInside = currDataIndexInside);
            if (currDirty) {
                currItemModel = data.getItemModel(dataIndexInside);
                currLabelNormalModel = currItemModel.getModel(LABEL_NORMAL);
                currLabelEmphasisModel = currItemModel.getModel(LABEL_EMPHASIS);
                currLabelValueDim = labelHelper.findLabelValueDim(data);
                currVisualColor = data.getItemVisual(dataIndexInside, 'color');

                currDirty = false;
            }
        }

        /**
         * @public
         * @param {nubmer|string} dim
         * @param {number} [dataIndexInside=currDataIndexInside]
         * @return {number|string} value
         */
        function value(dim, dataIndexInside) {
            dataIndexInside == null && (dataIndexInside = currDataIndexInside);
            return data.get(data.getDimension(dim || 0), dataIndexInside);
        }

        /**
         * By default, `visual` is applied to style (to support visualMap).
         * `visual.color` is applied at `fill`. If user want apply visual.color on `stroke`,
         * it can be implemented as:
         * `api.style({stroke: api.visual('color'), fill: null})`;
         * @public
         * @param {Object} [extra]
         * @param {number} [dataIndexInside=currDataIndexInside]
         */
        function style(extra, dataIndexInside) {
            dataIndexInside == null && (dataIndexInside = currDataIndexInside);
            updateCache(dataIndexInside);

            var itemStyle = currItemModel.getModel(ITEM_STYLE_NORMAL_PATH).getItemStyle();

            currVisualColor != null && (itemStyle.fill = currVisualColor);
            var opacity = data.getItemVisual(dataIndexInside, 'opacity');
            opacity != null && (itemStyle.opacity = opacity);

            labelHelper.setTextToStyle(
                data, dataIndexInside, currLabelValueDim, itemStyle,
                customSeries, currLabelNormalModel, currVisualColor
            );

            extra && zrUtil.extend(itemStyle, extra);
            return itemStyle;
        }

        /**
         * @public
         * @param {Object} [extra]
         * @param {number} [dataIndexInside=currDataIndexInside]
         */
        function styleEmphasis(extra, dataIndexInside) {
            dataIndexInside == null && (dataIndexInside = currDataIndexInside);
            updateCache(dataIndexInside);

            var itemStyle = currItemModel.getModel(ITEM_STYLE_EMPHASIS_PATH).getItemStyle();

            labelHelper.setTextToStyle(
                data, dataIndexInside, currLabelValueDim, itemStyle,
                customSeries, currLabelEmphasisModel, currVisualColor
            );

            extra && zrUtil.extend(itemStyle, extra);
            return itemStyle;
        }

        /**
         * @public
         * @param {string} visualType
         * @param {number} [dataIndexInside=currDataIndexInside]
         */
        function visual(visualType, dataIndexInside) {
            dataIndexInside == null && (dataIndexInside = currDataIndexInside);
            return data.getItemVisual(dataIndexInside, visualType);
        }

        /**
         * @public
         * @param {number} opt.count Positive interger.
         * @param {number} [opt.barWidth]
         * @param {number} [opt.barMaxWidth]
         * @param {number} [opt.barGap]
         * @param {number} [opt.barCategoryGap]
         * @return {Object} {width, offset, offsetCenter} is not support, return undefined.
         */
        function barLayout(opt) {
            if (coordSys.getBaseAxis) {
                var baseAxis = coordSys.getBaseAxis();
                return barGrid.getLayoutOnAxis(zrUtil.defaults({axis: baseAxis}, opt), api);
            }
        }

        /**
         * @public
         * @return {Array.<number>}
         */
        function currentSeriesIndices() {
            return ecModel.getCurrentSeriesIndices();
        }
    }

    function wrapEncodeDef(data) {
        var encodeDef = {};
        zrUtil.each(data.dimensions, function (dimName, dataDimIndex) {
            var dimInfo = data.getDimensionInfo(dimName);
            if (!dimInfo.isExtraCoord) {
                var coordDim = dimInfo.coordDim;
                var dataDims = encodeDef[coordDim] = encodeDef[coordDim] || [];
                dataDims[dimInfo.coordDimIndex] = dataDimIndex;
            }
        });
        return encodeDef;
    }

    function createOrUpdate(el, dataIndex, elOption, animatableModel, group, data) {
        el = doCreateOrUpdate(el, dataIndex, elOption, animatableModel, group, data);
        el && data.setItemGraphicEl(dataIndex, el);
    }

    function doCreateOrUpdate(el, dataIndex, elOption, animatableModel, group, data) {
        if (el && elOption.type !== el.__customGraphicType) {
            group.remove(el);
            el = null;
        }

        // `elOption.type` is undefined when `renderItem` returns nothing.
        if (elOption.type == null) {
            return;
        }

        var isInit = !el;
        !el && (el = createEl(elOption));
        updateEl(el, dataIndex, elOption, animatableModel, data, isInit);

        elOption.type === 'group' && zrUtil.each(elOption.children, function (childOption, index) {
            doCreateOrUpdate(el.childAt(index), dataIndex, childOption, animatableModel, el, data);
        });

        group.add(el);

        return el;
    }

});
