define(function (require) {

    var echarts = require('../echarts');
    var zrUtil = require('zrender/core/util');
    var graphicUtil = require('../util/graphic');
    var labelHelper = require('./helper/labelHelper');
    var createListFromArray = require('./helper/createListFromArray');

    var ITEM_STYLE_NORMAL_PATH = ['itemStyle', 'normal'];
    var ITEM_STYLE_EMPHASIS_PATH = ['itemStyle', 'emphasis'];
    var LABEL_NORMAL = ['label', 'normal'];
    var LABEL_EMPHASIS = ['label', 'emphasis'];


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
            var getElOption = makeElOptionGetter(customSeries, data, api);

            data.diff(oldData)
                .add(function (newIdx) {
                    if (data.hasValue(newIdx)) {
                        var el = createOrUpdate(
                            null, newIdx, getElOption(newIdx), customSeries, group, data
                        );
                        if (data.hasValue(newIdx)) {
                            data.setItemGraphicEl(newIdx, el);
                            group.add(el);
                        }
                    }
                })
                .update(function (newIdx, oldIdx) {
                    var el = oldData.getItemGraphicEl(oldIdx);
                    if (data.hasValue(newIdx)) {
                        el = createOrUpdate(
                            el, newIdx, getElOption(newIdx), customSeries, group, data
                        );
                        data.setItemGraphicEl(newIdx, el);
                    }
                    else {
                        group.remove(el);
                    }
                })
                .remove(function (oldIdx) {
                    var el = oldData.getItemGraphicEl(oldIdx);
                    el && group.remove(el);
                })
                .execute();

            this._data = data;
        }
    });


    function createEl(dataIndex, elOption) {
        var graphicType = elOption.type;

        if (__DEV__) {
            zrUtil.assert(graphicType, 'graphic type MUST be set');
        }

        var Clz = graphicUtil[graphicType.charAt(0).toUpperCase() + graphicType.slice(1)];

        if (__DEV__) {
            zrUtil.assert(Clz, 'graphic type can not be found');
        }

        var el = new Clz();
        el.__graphicType = graphicType;

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
        el.attr({z2: elOption.z2, silent: elOption.silent});

        el.styleEmphasis !== false && graphicUtil.setHoverStyle(el, el.styleEmphasis);
    }

    function makeElOptionGetter(customSeries, data, api) {
        var renderItem = customSeries.get('renderItem');
        var coordSys = customSeries.coordinateSystem;

        if (__DEV__) {
            zrUtil.assert(renderItem, 'series.render is required.');
            zrUtil.assert(coordSys.prepareInfoForCustomSeries, 'This coordSys does not support custom series.');
        }

        var prepareResult = coordSys.prepareInfoForCustomSeries();

        var userAPI = zrUtil.defaults({
            getWidth: api.getWidth,
            getHeight: api.getHeight,
            getZr: api.getZr,
            getDevicePixelRatio: api.getDevicePixelRatio,
            value: value,
            style: style,
            styleEmphasis: styleEmphasis,
            visual: visual
        }, prepareResult.api);

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

            return renderItem({
                seriesId: customSeries.id,
                seriesName: customSeries.name,
                seriesIndex: customSeries.seriesIndex,
                dataIndexInside: dataIndexInside,
                dataIndex: data.getRawIndex(dataIndexInside),
                coordSys: prepareResult.coordSys,
                encode: wrapEncodeDef(customSeries.getData())
            }, userAPI);
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
        if (el && elOption.type !== el.__graphicType) {
            group.remove(el);
            el = null;
        }

        var isInit = !el;
        if (!el) {
            el = createEl(dataIndex, elOption);
        }
        updateEl(el, dataIndex, elOption, animatableModel, data, isInit);

        elOption.type === 'group' && zrUtil.each(elOption.children, function (childOption, index) {
            createOrUpdate(el.childAt(index), dataIndex, childOption, animatableModel, el, data);
        });

        group.add(el);

        return el;
    }

});
