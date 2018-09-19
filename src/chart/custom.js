/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import {__DEV__} from '../config';
import * as zrUtil from 'zrender/src/core/util';
import * as graphicUtil from '../util/graphic';
import {getDefaultLabel} from './helper/labelHelper';
import createListFromArray from './helper/createListFromArray';
import {getLayoutOnAxis} from '../layout/barGrid';
import DataDiffer from '../data/DataDiffer';
import SeriesModel from '../model/Series';
import ChartView from '../view/Chart';

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

SeriesModel.extend({

    type: 'series.custom',

    dependencies: ['grid', 'polar', 'geo', 'singleAxis', 'calendar'],

    defaultOption: {
        coordinateSystem: 'cartesian2d', // Can be set as 'none'
        zlevel: 0,
        z: 2,
        legendHoverLink: true,

        useTransform: true

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

    /**
     * @override
     */
    getInitialData: function (option, ecModel) {
        return createListFromArray(this.getSource(), this);
    },

    /**
     * @override
     */
    getDataParams: function (dataIndex, dataType, el) {
        var params = SeriesModel.prototype.getDataParams.apply(this, arguments);
        el && (params.info = el.info);
        return params;
    }
});

// -----
// View
// -----

ChartView.extend({

    type: 'custom',

    /**
     * @private
     * @type {module:echarts/data/List}
     */
    _data: null,

    /**
     * @override
     */
    render: function (customSeries, ecModel, api, payload) {
        var oldData = this._data;
        var data = customSeries.getData();
        var group = this.group;
        var renderItem = makeRenderItem(customSeries, data, ecModel, api);

        // By default, merge mode is applied. In most cases, custom series is
        // used in the scenario that data amount is not large but graphic elements
        // is complicated, where merge mode is probably necessary for optimization.
        // For example, reuse graphic elements and only update the transform when
        // roam or data zoom according to `actionType`.
        data.diff(oldData)
            .add(function (newIdx) {
                createOrUpdate(
                    null, newIdx, renderItem(newIdx, payload), customSeries, group, data
                );
            })
            .update(function (newIdx, oldIdx) {
                var el = oldData.getItemGraphicEl(oldIdx);
                createOrUpdate(
                    el, newIdx, renderItem(newIdx, payload), customSeries, group, data
                );
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

    incrementalRender: function (params, customSeries, ecModel, api, payload) {
        var data = customSeries.getData();
        var renderItem = makeRenderItem(customSeries, data, ecModel, api);
        function setIncrementalAndHoverLayer(el) {
            if (!el.isGroup) {
                el.incremental = true;
                el.useHoverLayer = true;
            }
        }
        for (var idx = params.start; idx < params.end; idx++) {
            var el = createOrUpdate(null, idx, renderItem(idx, payload), customSeries, this.group, data);
            el.traverse(setIncrementalAndHoverLayer);
        }
    },

    /**
     * @override
     */
    dispose: zrUtil.noop,

    /**
     * @override
     */
    filterForExposedEvent: function (eventType, query, targetEl, packedEvent) {
        var elementName = query.element;
        if (elementName == null || targetEl.name === elementName) {
            return true;
        }

        // Enable to give a name on a group made by `renderItem`, and listen
        // events that triggerd by its descendents.
        while ((targetEl = targetEl.parent) && targetEl !== this.group) {
            if (targetEl.name === elementName) {
                return true;
            }
        }

        return false;
    }
});


function createEl(elOption) {
    var graphicType = elOption.type;
    var el;

    if (graphicType === 'path') {
        var shape = elOption.shape;
        // Using pathRect brings convenience to users sacle svg path.
        var pathRect = (shape.width != null && shape.height != null)
            ? {
                x: shape.x || 0,
                y: shape.y || 0,
                width: shape.width,
                height: shape.height
            }
            : null;
        var pathData = getPathData(shape);
        // Path is also used for icon, so layout 'center' by default.
        el = graphicUtil.makePath(pathData, null, pathRect, shape.layout || 'center');
        el.__customPathData = pathData;
    }
    else if (graphicType === 'image') {
        el = new graphicUtil.Image({});
        el.__customImagePath = elOption.style.image;
    }
    else if (graphicType === 'text') {
        el = new graphicUtil.Text({});
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

function updateEl(el, dataIndex, elOption, animatableModel, data, isInit, isRoot) {
    var transitionProps = {};
    var elOptionStyle = elOption.style || {};

    elOption.shape && (transitionProps.shape = zrUtil.clone(elOption.shape));
    elOption.position && (transitionProps.position = elOption.position.slice());
    elOption.scale && (transitionProps.scale = elOption.scale.slice());
    elOption.origin && (transitionProps.origin = elOption.origin.slice());
    elOption.rotation && (transitionProps.rotation = elOption.rotation);

    if (el.type === 'image' && elOption.style) {
        var targetStyle = transitionProps.style = {};
        zrUtil.each(['x', 'y', 'width', 'height'], function (prop) {
            prepareStyleTransition(prop, targetStyle, elOptionStyle, el.style, isInit);
        });
    }

    if (el.type === 'text' && elOption.style) {
        var targetStyle = transitionProps.style = {};
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
        el.attr(transitionProps);
    }
    else {
        graphicUtil.updateProps(el, transitionProps, animatableModel, dataIndex);
    }

    // Merge by default.
    // z2 must not be null/undefined, otherwise sort error may occur.
    elOption.hasOwnProperty('z2') && el.attr('z2', elOption.z2 || 0);
    elOption.hasOwnProperty('silent') && el.attr('silent', elOption.silent);
    elOption.hasOwnProperty('invisible') && el.attr('invisible', elOption.invisible);
    elOption.hasOwnProperty('ignore') && el.attr('ignore', elOption.ignore);
    // `elOption.info` enables user to mount some info on
    // elements and use them in event handlers.
    // Update them only when user specified, otherwise, remain.
    elOption.hasOwnProperty('info') && el.attr('info', elOption.info);

    // If `elOption.styleEmphasis` is `false`, remove hover style. The
    // logic is ensured by `graphicUtil.setElementHoverStyle`.
    var styleEmphasis = elOption.styleEmphasis;
    var disableStyleEmphasis = styleEmphasis === false;
    if (!(
        // Try to escapse setting hover style for performance.
        (el.__cusHasEmphStl && styleEmphasis == null)
        || (!el.__cusHasEmphStl && disableStyleEmphasis)
    )) {
        // Should not use graphicUtil.setHoverStyle, since the styleEmphasis
        // should not be share by group and its descendants.
        graphicUtil.setElementHoverStyle(el, styleEmphasis);
        el.__cusHasEmphStl = !disableStyleEmphasis;
    }
    isRoot && graphicUtil.setAsHoverStyleTrigger(el, !disableStyleEmphasis);
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
        // The life cycle of context: current round of rendering.
        // The global life cycle is probably not necessary, because
        // user can store global status by themselves.
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

    return function (dataIndexInside, payload) {
        currDataIndexInside = dataIndexInside;
        currDirty = true;

        return renderItem && renderItem(
            zrUtil.defaults({
                dataIndexInside: dataIndexInside,
                dataIndex: data.getRawIndex(dataIndexInside),
                // Can be used for optimization when zoom or roam.
                actionType: payload ? payload.type : null
            }, userParams),
            userAPI
        );
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
    el = doCreateOrUpdate(el, dataIndex, elOption, animatableModel, group, data, true);
    el && data.setItemGraphicEl(dataIndex, el);

    return el;
}

function doCreateOrUpdate(el, dataIndex, elOption, animatableModel, group, data, isRoot) {

    // [Rule]
    // By default, follow merge mode.
    //     (It probably brings benifit for performance in some cases of large data, where
    //     user program can be optimized to that only updated props needed to be re-calculated,
    //     or according to `actionType` some calculation can be skipped.)
    // If `renderItem` returns `null`/`undefined`/`false`, remove the previous el if existing.
    //     (It seems that violate the "merge" principle, but most of users probably intuitively
    //     regard "return;" as "show nothing element whatever", so make a exception to meet the
    //     most cases.)

    var simplyRemove = !elOption; // `null`/`undefined`/`false`
    elOption = elOption || {};
    var elOptionType = elOption.type;
    var elOptionShape = elOption.shape;
    var elOptionStyle = elOption.style;

    if (el && (
        simplyRemove
        // || elOption.$merge === false
        // If `elOptionType` is `null`, follow the merge principle.
        || (elOptionType != null
            && elOptionType !== el.__customGraphicType
        )
        || (elOptionType === 'path'
            && hasOwnPathData(elOptionShape) && getPathData(elOptionShape) !== el.__customPathData
        )
        || (elOptionType === 'image'
            && hasOwn(elOptionStyle, 'image') && elOptionStyle.image !== el.__customImagePath
        )
        // FIXME test and remove this restriction?
        || (elOptionType === 'text'
            && hasOwn(elOptionShape, 'text') && elOptionStyle.text !== el.__customText
        )
    )) {
        group.remove(el);
        el = null;
    }

    // `elOption.type` is undefined when `renderItem` returns nothing.
    if (simplyRemove) {
        return;
    }

    var isInit = !el;
    !el && (el = createEl(elOption));
    updateEl(el, dataIndex, elOption, animatableModel, data, isInit, isRoot);

    if (elOptionType === 'group') {
        mergeChildren(el, dataIndex, elOption, animatableModel, data);
    }

    // Always add whatever already added to ensure sequence.
    group.add(el);

    return el;
}

// Usage:
// (1) By default, `elOption.$mergeChildren` is `'byIndex'`, which indicates that
//     the existing children will not be removed, and enables the feature that
//     update some of the props of some of the children simply by construct
//     the returned children of `renderItem` like:
//     `var children = group.children = []; children[3] = {opacity: 0.5};`
// (2) If `elOption.$mergeChildren` is `'byName'`, add/update/remove children
//     by child.name. But that might be lower performance.
// (3) If `elOption.$mergeChildren` is `false`, the existing children will be
//     replaced totally.
// (4) If `!elOption.children`, following the "merge" principle, nothing will happen.
//
// For implementation simpleness, do not provide a direct way to remove sinlge
// child (otherwise the total indicies of the children array have to be modified).
// User can remove a single child by set its `ignore` as `true` or replace
// it by another element, where its `$merge` can be set as `true` if necessary.
function mergeChildren(el, dataIndex, elOption, animatableModel, data) {
    var newChildren = elOption.children;
    var newLen = newChildren ? newChildren.length : 0;
    var mergeChildren = elOption.$mergeChildren;
    // `diffChildrenByName` has been deprecated.
    var byName = mergeChildren === 'byName' || elOption.diffChildrenByName;
    var notMerge = mergeChildren === false;

    // For better performance on roam update, only enter if necessary.
    if (!newLen && !byName && !notMerge) {
        return;
    }

    if (byName) {
        diffGroupChildren({
            oldChildren: el.children() || [],
            newChildren: newChildren || [],
            dataIndex: dataIndex,
            animatableModel: animatableModel,
            group: el,
            data: data
        });
        return;
    }

    notMerge && el.removeAll();

    // Mapping children of a group simply by index, which
    // might be better performance.
    var index = 0;
    for (; index < newLen; index++) {
        newChildren[index] && doCreateOrUpdate(
            el.childAt(index),
            dataIndex,
            newChildren[index],
            animatableModel,
            el,
            data
        );
    }
    if (__DEV__) {
        zrUtil.assert(
            !notMerge || el.childCount() === index,
            'MUST NOT contain empty item in children array when `group.$mergeChildren` is `false`.'
        );
    }
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

function getPathData(shape) {
    // "d" follows the SVG convention.
    return shape && (shape.pathData || shape.d);
}

function hasOwnPathData(shape) {
    return shape && (shape.hasOwnProperty('pathData') || shape.hasOwnProperty('d'));
}

function hasOwn(host, prop) {
    return host && host.hasOwnProperty(prop);
}
