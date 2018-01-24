import {__DEV__} from '../config';
import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';
import * as graphicUtil from '../util/graphic';
import {getDefaultLabel} from './helper/labelHelper';
import createListFromArray from './helper/createListFromArray';
import { getLayoutOnAxis } from '../layout/barGrid';
import DataDiffer from '../data/DataDiffer';

import prepareCartesian2d from '../coord/cartesian/prepareCustom';
import prepareGeo from '../coord/geo/prepareCustom';
import prepareSingleAxis from '../coord/single/prepareCustom';
import preparePolar from '../coord/polar/prepareCustom';
import prepareCalendar from '../coord/calendar/prepareCustom';


var ITEM_STYLE_NORMAL_PATH = ['itemStyle'];
var ITEM_STYLE_EMPHASIS_PATH = ['emphasis', 'itemStyle'];
var LABEL_NORMAL = ['label'];
var LABEL_EMPHASIS = ['emphasis', 'label'];
// Use prefix to avoid index to be the same as el.name,
// which will cause weird udpate animation.
var GROUP_DIFF_PREFIX = 'e\0\0';

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
    cartesian2d: prepareCartesian2d,
    geo: prepareGeo,
    singleAxis: prepareSingleAxis,
    polar: preparePolar,
    calendar: prepareCalendar
};

// ------
// Model
// ------

echarts.extendSeriesModel({

    type: 'series.custom',

    dependencies: ['grid', 'polar', 'geo', 'singleAxis', 'calendar'],

    defaultOption: {
        coordinateSystem: 'cartesian2d', // Can be set as 'none'
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
        return createListFromArray(this.getSource(), this);
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

        this.group.removeAll();

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
    },

    incrementalPrepareRender: function (customSeries, ecModel, api) {
        this.group.removeAll();
        this._data = null;
    },

    incrementalRender: function (params, customSeries, ecModel, api) {
        var data = customSeries.getData();
        var renderItem = makeRenderItem(customSeries, data, ecModel, api);
        function setIncrementalAndHoverLayer(el) {
            if (!el.isGroup) {
                el.incremental = true;
                el.useHoverLayer = true;
            }
        }
        for (var idx = params.start; idx < params.end; idx++) {
            var el = createOrUpdate(null, idx, renderItem(idx), customSeries, this.group, data);
            el.traverse(setIncrementalAndHoverLayer);
        }
    },

    /**
     * @override
     */
    dispose: zrUtil.noop
});


function createEl(elOption) {
    var graphicType = elOption.type;
    var el;

    if (graphicType === 'path') {
        var shape = elOption.shape;
        el = graphicUtil.makePath(
            shape.pathData,
            null,
            {
                x: shape.x || 0,
                y: shape.y || 0,
                width: shape.width || 0,
                height: shape.height || 0
            },
            'center'
        );
        el.__customPathData = elOption.pathData;
    }
    else if (graphicType === 'image') {
        el = new graphicUtil.Image({
        });
        el.__customImagePath = elOption.style.image;
    }
    else if (graphicType === 'text') {
        el = new graphicUtil.Text({
        });
        el.__customText = elOption.style.text;
    }
    else {
        var Clz = graphicUtil[graphicType.charAt(0).toUpperCase() + graphicType.slice(1)];

        if (__DEV__) {
            zrUtil.assert(Clz, 'graphic type "' + graphicType + '" can not be found.');
        }

        el = new Clz();
    }

    el.__customGraphicType = graphicType;
    el.name = elOption.name;

    return el;
}

function updateEl(el, dataIndex, elOption, animatableModel, data, isInit) {
    var targetProps = {};
    var elOptionStyle = elOption.style || {};

    elOption.shape && (targetProps.shape = zrUtil.clone(elOption.shape));
    elOption.position && (targetProps.position = elOption.position.slice());
    elOption.scale && (targetProps.scale = elOption.scale.slice());
    elOption.origin && (targetProps.origin = elOption.origin.slice());
    elOption.rotation && (targetProps.rotation = elOption.rotation);

    if (el.type === 'image' && elOption.style) {
        var targetStyle = targetProps.style = {};
        zrUtil.each(['x', 'y', 'width', 'height'], function (prop) {
            prepareStyleTransition(prop, targetStyle, elOptionStyle, el.style, isInit);
        });
    }

    if (el.type === 'text' && elOption.style) {
        var targetStyle = targetProps.style = {};
        zrUtil.each(['x', 'y'], function (prop) {
            prepareStyleTransition(prop, targetStyle, elOptionStyle, el.style, isInit);
        });
        // Compatible with previous: both support
        // textFill and fill, textStroke and stroke in 'text' element.
        !elOptionStyle.hasOwnProperty('textFill') && elOptionStyle.fill && (
            elOptionStyle.textFill = elOptionStyle.fill
        );
        !elOptionStyle.hasOwnProperty('textStroke') && elOptionStyle.stroke && (
            elOptionStyle.textStroke = elOptionStyle.stroke
        );
    }

    if (el.type !== 'group') {
        el.useStyle(elOptionStyle);

        // Init animation.
        if (isInit) {
            el.style.opacity = 0;
            var targetOpacity = elOptionStyle.opacity;
            targetOpacity == null && (targetOpacity = 1);
            graphicUtil.initProps(el, {style: {opacity: targetOpacity}}, animatableModel, dataIndex);
        }
    }

    if (isInit) {
        el.attr(targetProps);
    }
    else {
        graphicUtil.updateProps(el, targetProps, animatableModel, dataIndex);
    }

    // z2 must not be null/undefined, otherwise sort error may occur.
    el.attr({z2: elOption.z2 || 0, silent: elOption.silent});

    elOption.styleEmphasis !== false && graphicUtil.setHoverStyle(el, elOption.styleEmphasis);
}

function prepareStyleTransition(prop, targetStyle, elOptionStyle, oldElStyle, isInit) {
    if (elOptionStyle[prop] != null && !isInit) {
        targetStyle[prop] = elOptionStyle[prop];
        elOptionStyle[prop] = oldElStyle[prop];
    }
}

function makeRenderItem(customSeries, data, ecModel, api) {
    var renderItem = customSeries.get('renderItem');
    var coordSys = customSeries.coordinateSystem;
    var prepareResult = {};

    if (coordSys) {
        if (__DEV__) {
            zrUtil.assert(renderItem, 'series.render is required.');
            zrUtil.assert(
                coordSys.prepareCustoms || prepareCustoms[coordSys.type],
                'This coordSys does not support custom series.'
            );
        }

        prepareResult = coordSys.prepareCustoms
            ? coordSys.prepareCustoms()
            : prepareCustoms[coordSys.type](coordSys);
    }

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
        currentSeriesIndices: currentSeriesIndices,
        font: font
    }, prepareResult.api || {});

    var userParams = {
        context: {},
        seriesId: customSeries.id,
        seriesName: customSeries.name,
        seriesIndex: customSeries.seriesIndex,
        coordSys: prepareResult.coordSys,
        dataInsideLength: data.count(),
        encode: wrapEncodeDef(customSeries.getData())
    };

    // Do not support call `api` asynchronously without dataIndexInside input.
    var currDataIndexInside;
    var currDirty = true;
    var currItemModel;
    var currLabelNormalModel;
    var currLabelEmphasisModel;
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
            currVisualColor = data.getItemVisual(dataIndexInside, 'color');

            currDirty = false;
        }
    }

    /**
     * @public
     * @param {number|string} dim
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

        graphicUtil.setTextStyle(itemStyle, currLabelNormalModel, null, {
            autoColor: currVisualColor,
            isRectText: true
        });

        itemStyle.text = currLabelNormalModel.getShallow('show')
            ? zrUtil.retrieve2(
                customSeries.getFormattedLabel(dataIndexInside, 'normal'),
                getDefaultLabel(data, dataIndexInside)
            )
            : null;

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

        graphicUtil.setTextStyle(itemStyle, currLabelEmphasisModel, null, {
            isRectText: true
        }, true);

        itemStyle.text = currLabelEmphasisModel.getShallow('show')
            ? zrUtil.retrieve3(
                customSeries.getFormattedLabel(dataIndexInside, 'emphasis'),
                customSeries.getFormattedLabel(dataIndexInside, 'normal'),
                getDefaultLabel(data, dataIndexInside)
            )
            : null;

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
            return getLayoutOnAxis(zrUtil.defaults({axis: baseAxis}, opt), api);
        }
    }

    /**
     * @public
     * @return {Array.<number>}
     */
    function currentSeriesIndices() {
        return ecModel.getCurrentSeriesIndices();
    }

    /**
     * @public
     * @param {Object} opt
     * @param {string} [opt.fontStyle]
     * @param {number} [opt.fontWeight]
     * @param {number} [opt.fontSize]
     * @param {string} [opt.fontFamily]
     * @return {string} font string
     */
    function font(opt) {
        return graphicUtil.getFont(opt, ecModel);
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

    return el;
}

function doCreateOrUpdate(el, dataIndex, elOption, animatableModel, group, data) {
    var elOptionType = elOption.type;
    if (el
        && elOptionType !== el.__customGraphicType
        && (elOptionType !== 'path' || elOption.pathData !== el.__customPathData)
        && (elOptionType !== 'image' || elOption.style.image !== el.__customImagePath)
        && (elOptionType !== 'text' || elOption.style.text !== el.__customText)
    ) {
        group.remove(el);
        el = null;
    }

    // `elOption.type` is undefined when `renderItem` returns nothing.
    if (elOptionType == null) {
        return;
    }

    var isInit = !el;
    !el && (el = createEl(elOption));
    updateEl(el, dataIndex, elOption, animatableModel, data, isInit);

    if (elOptionType === 'group') {
        var oldChildren = el.children() || [];
        var newChildren = elOption.children || [];

        if (elOption.diffChildrenByName) {
            // lower performance.
            diffGroupChildren({
                oldChildren: oldChildren,
                newChildren: newChildren,
                dataIndex: dataIndex,
                animatableModel: animatableModel,
                group: el,
                data: data
            });
        }
        else {
            // better performance.
            var index = 0;
            for (; index < newChildren.length; index++) {
                doCreateOrUpdate(
                    el.childAt(index),
                    dataIndex,
                    newChildren[index],
                    animatableModel,
                    el,
                    data
                );
            }
            for (; index < oldChildren.length; index++) {
                oldChildren[index] && el.remove(oldChildren[index]);
            }
        }
    }

    group.add(el);

    return el;
}

function diffGroupChildren(context) {
    (new DataDiffer(
        context.oldChildren,
        context.newChildren,
        getKey,
        getKey,
        context
    ))
        .add(processAddUpdate)
        .update(processAddUpdate)
        .remove(processRemove)
        .execute();
}

function getKey(item, idx) {
    var name = item && item.name;
    return name != null ? name : GROUP_DIFF_PREFIX + idx;
}

function processAddUpdate(newIndex, oldIndex) {
    var context = this.context;
    var childOption = newIndex != null ? context.newChildren[newIndex] : null;
    var child = oldIndex != null ? context.oldChildren[oldIndex] : null;

    doCreateOrUpdate(
        child,
        context.dataIndex,
        childOption,
        context.animatableModel,
        context.group,
        context.data
    );
}

function processRemove(oldIndex) {
    var context = this.context;
    var child = context.oldChildren[oldIndex];
    child && context.group.remove(child);
}
