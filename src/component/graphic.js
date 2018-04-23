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
import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';

import * as modelUtil from '../util/model';
import * as graphicUtil from '../util/graphic';
import * as layoutUtil from '../util/layout';

// -------------
// Preprocessor
// -------------

echarts.registerPreprocessor(function (option) {
    var graphicOption = option.graphic;

    // Convert
    // {graphic: [{left: 10, type: 'circle'}, ...]}
    // or
    // {graphic: {left: 10, type: 'circle'}}
    // to
    // {graphic: [{elements: [{left: 10, type: 'circle'}, ...]}]}
    if (zrUtil.isArray(graphicOption)) {
        if (!graphicOption[0] || !graphicOption[0].elements) {
            option.graphic = [{elements: graphicOption}];
        }
        else {
            // Only one graphic instance can be instantiated. (We dont
            // want that too many views are created in echarts._viewMap)
            option.graphic = [option.graphic[0]];
        }
    }
    else if (graphicOption && !graphicOption.elements) {
        option.graphic = [{elements: [graphicOption]}];
    }
});

// ------
// Model
// ------

var GraphicModel = echarts.extendComponentModel({

    type: 'graphic',

    defaultOption: {

        // Extra properties for each elements:
        //
        // left/right/top/bottom: (like 12, '22%', 'center', default undefined)
        //      If left/rigth is set, shape.x/shape.cx/position will not be used.
        //      If top/bottom is set, shape.y/shape.cy/position will not be used.
        //      This mechanism is useful when you want to position a group/element
        //      against the right side or the center of this container.
        //
        // width/height: (can only be pixel value, default 0)
        //      Only be used to specify contianer(group) size, if needed. And
        //      can not be percentage value (like '33%'). See the reason in the
        //      layout algorithm below.
        //
        // bounding: (enum: 'all' (default) | 'raw')
        //      Specify how to calculate boundingRect when locating.
        //      'all': Get uioned and transformed boundingRect
        //          from both itself and its descendants.
        //          This mode simplies confining a group of elements in the bounding
        //          of their ancester container (e.g., using 'right: 0').
        //      'raw': Only use the boundingRect of itself and before transformed.
        //          This mode is similar to css behavior, which is useful when you
        //          want an element to be able to overflow its container. (Consider
        //          a rotated circle needs to be located in a corner.)

        // Note: elements is always behind its ancestors in this elements array.
        elements: [],
        parentId: null
    },

    /**
     * Save el options for the sake of the performance (only update modified graphics).
     * The order is the same as those in option. (ancesters -> descendants)
     *
     * @private
     * @type {Array.<Object>}
     */
    _elOptionsToUpdate: null,

    /**
     * @override
     */
    mergeOption: function (option) {
        // Prevent default merge to elements
        var elements = this.option.elements;
        this.option.elements = null;

        GraphicModel.superApply(this, 'mergeOption', arguments);

        this.option.elements = elements;
    },

    /**
     * @override
     */
    optionUpdated: function (newOption, isInit) {
        var thisOption = this.option;
        var newList = (isInit ? thisOption : newOption).elements;
        var existList = thisOption.elements = isInit ? [] : thisOption.elements;

        var flattenedList = [];
        this._flatten(newList, flattenedList);

        var mappingResult = modelUtil.mappingToExists(existList, flattenedList);
        modelUtil.makeIdAndName(mappingResult);

        // Clear elOptionsToUpdate
        var elOptionsToUpdate = this._elOptionsToUpdate = [];

        zrUtil.each(mappingResult, function (resultItem, index) {
            var newElOption = resultItem.option;

            if (__DEV__) {
                zrUtil.assert(
                    zrUtil.isObject(newElOption) || resultItem.exist,
                    'Empty graphic option definition'
                );
            }

            if (!newElOption) {
                return;
            }

            elOptionsToUpdate.push(newElOption);

            setKeyInfoToNewElOption(resultItem, newElOption);

            mergeNewElOptionToExist(existList, index, newElOption);

            setLayoutInfoToExist(existList[index], newElOption);

        }, this);

        // Clean
        for (var i = existList.length - 1; i >= 0; i--) {
            if (existList[i] == null) {
                existList.splice(i, 1);
            }
            else {
                // $action should be volatile, otherwise option gotten from
                // `getOption` will contain unexpected $action.
                delete existList[i].$action;
            }
        }
    },

    /**
     * Convert
     * [{
     *  type: 'group',
     *  id: 'xx',
     *  children: [{type: 'circle'}, {type: 'polygon'}]
     * }]
     * to
     * [
     *  {type: 'group', id: 'xx'},
     *  {type: 'circle', parentId: 'xx'},
     *  {type: 'polygon', parentId: 'xx'}
     * ]
     *
     * @private
     * @param {Array.<Object>} optionList option list
     * @param {Array.<Object>} result result of flatten
     * @param {Object} parentOption parent option
     */
    _flatten: function (optionList, result, parentOption) {
        zrUtil.each(optionList, function (option) {
            if (!option) {
                return;
            }

            if (parentOption) {
                option.parentOption = parentOption;
            }

            result.push(option);

            var children = option.children;
            if (option.type === 'group' && children) {
                this._flatten(children, result, option);
            }
            // Deleting for JSON output, and for not affecting group creation.
            delete option.children;
        }, this);
    },

    // FIXME
    // Pass to view using payload? setOption has a payload?
    useElOptionsToUpdate: function () {
        var els = this._elOptionsToUpdate;
        // Clear to avoid render duplicately when zooming.
        this._elOptionsToUpdate = null;
        return els;
    }
});

// -----
// View
// -----

echarts.extendComponentView({

    type: 'graphic',

    /**
     * @override
     */
    init: function (ecModel, api) {

        /**
         * @private
         * @type {module:zrender/core/util.HashMap}
         */
        this._elMap = zrUtil.createHashMap();

        /**
         * @private
         * @type {module:echarts/graphic/GraphicModel}
         */
        this._lastGraphicModel;
    },

    /**
     * @override
     */
    render: function (graphicModel, ecModel, api) {

        // Having leveraged between use cases and algorithm complexity, a very
        // simple layout mechanism is used:
        // The size(width/height) can be determined by itself or its parent (not
        // implemented yet), but can not by its children. (Top-down travel)
        // The location(x/y) can be determined by the bounding rect of itself
        // (can including its descendants or not) and the size of its parent.
        // (Bottom-up travel)

        // When `chart.clear()` or `chart.setOption({...}, true)` with the same id,
        // view will be reused.
        if (graphicModel !== this._lastGraphicModel) {
            this._clear();
        }
        this._lastGraphicModel = graphicModel;

        this._updateElements(graphicModel, api);
        this._relocate(graphicModel, api);
    },

    /**
     * Update graphic elements.
     *
     * @private
     * @param {Object} graphicModel graphic model
     * @param {module:echarts/ExtensionAPI} api extension API
     */
    _updateElements: function (graphicModel, api) {
        var elOptionsToUpdate = graphicModel.useElOptionsToUpdate();

        if (!elOptionsToUpdate) {
            return;
        }

        var elMap = this._elMap;
        var rootGroup = this.group;

        // Top-down tranverse to assign graphic settings to each elements.
        zrUtil.each(elOptionsToUpdate, function (elOption) {
            var $action = elOption.$action;
            var id = elOption.id;
            var existEl = elMap.get(id);
            var parentId = elOption.parentId;
            var targetElParent = parentId != null ? elMap.get(parentId) : rootGroup;

            if (elOption.type === 'text') {
                var elOptionStyle = elOption.style;

                // In top/bottom mode, textVerticalAlign should not be used, which cause
                // inaccurately locating.
                if (elOption.hv && elOption.hv[1]) {
                    elOptionStyle.textVerticalAlign = elOptionStyle.textBaseline = null;
                }

                // Compatible with previous setting: both support fill and textFill,
                // stroke and textStroke.
                !elOptionStyle.hasOwnProperty('textFill') && elOptionStyle.fill && (
                    elOptionStyle.textFill = elOptionStyle.fill
                );
                !elOptionStyle.hasOwnProperty('textStroke') && elOptionStyle.stroke && (
                    elOptionStyle.textStroke = elOptionStyle.stroke
                );
            }

            // Remove unnecessary props to avoid potential problems.
            var elOptionCleaned = getCleanedElOption(elOption);

            // For simple, do not support parent change, otherwise reorder is needed.
            if (__DEV__) {
                existEl && zrUtil.assert(
                    targetElParent === existEl.parent,
                    'Changing parent is not supported.'
                );
            }

            if (!$action || $action === 'merge') {
                existEl
                    ? existEl.attr(elOptionCleaned)
                    : createEl(id, targetElParent, elOptionCleaned, elMap);
            }
            else if ($action === 'replace') {
                removeEl(existEl, elMap);
                createEl(id, targetElParent, elOptionCleaned, elMap);
            }
            else if ($action === 'remove') {
                removeEl(existEl, elMap);
            }

            var el = elMap.get(id);
            if (el) {
                el.__ecGraphicWidth = elOption.width;
                el.__ecGraphicHeight = elOption.height;
            }
        });
    },

    /**
     * Locate graphic elements.
     *
     * @private
     * @param {Object} graphicModel graphic model
     * @param {module:echarts/ExtensionAPI} api extension API
     */
    _relocate: function (graphicModel, api) {
        var elOptions = graphicModel.option.elements;
        var rootGroup = this.group;
        var elMap = this._elMap;

        // Bottom-up tranvese all elements (consider ec resize) to locate elements.
        for (var i = elOptions.length - 1; i >= 0; i--) {
            var elOption = elOptions[i];
            var el = elMap.get(elOption.id);

            if (!el) {
                continue;
            }

            var parentEl = el.parent;
            var containerInfo = parentEl === rootGroup
                ? {
                    width: api.getWidth(),
                    height: api.getHeight()
                }
                : { // Like 'position:absolut' in css, default 0.
                    width: parentEl.__ecGraphicWidth || 0,
                    height: parentEl.__ecGraphicHeight || 0
                };

            layoutUtil.positionElement(
                el, elOption, containerInfo, null,
                {hv: elOption.hv, boundingMode: elOption.bounding}
            );
        }
    },

    /**
     * Clear all elements.
     *
     * @private
     */
    _clear: function () {
        var elMap = this._elMap;
        elMap.each(function (el) {
            removeEl(el, elMap);
        });
        this._elMap = zrUtil.createHashMap();
    },

    /**
     * @override
     */
    dispose: function () {
        this._clear();
    }
});

function createEl(id, targetElParent, elOption, elMap) {
    var graphicType = elOption.type;

    if (__DEV__) {
        zrUtil.assert(graphicType, 'graphic type MUST be set');
    }

    var Clz = graphicUtil[graphicType.charAt(0).toUpperCase() + graphicType.slice(1)];

    if (__DEV__) {
        zrUtil.assert(Clz, 'graphic type can not be found');
    }

    var el = new Clz(elOption);
    targetElParent.add(el);
    elMap.set(id, el);
    el.__ecGraphicId = id;
}

function removeEl(existEl, elMap) {
    var existElParent = existEl && existEl.parent;
    if (existElParent) {
        existEl.type === 'group' && existEl.traverse(function (el) {
            removeEl(el, elMap);
        });
        elMap.removeKey(existEl.__ecGraphicId);
        existElParent.remove(existEl);
    }
}

// Remove unnecessary props to avoid potential problems.
function getCleanedElOption(elOption) {
    elOption = zrUtil.extend({}, elOption);
    zrUtil.each(
        ['id', 'parentId', '$action', 'hv', 'bounding'].concat(layoutUtil.LOCATION_PARAMS),
        function (name) {
            delete elOption[name];
        }
    );
    return elOption;
}

function isSetLoc(obj, props) {
    var isSet;
    zrUtil.each(props, function (prop) {
        obj[prop] != null && obj[prop] !== 'auto' && (isSet = true);
    });
    return isSet;
}

function setKeyInfoToNewElOption(resultItem, newElOption) {
    var existElOption = resultItem.exist;

    // Set id and type after id assigned.
    newElOption.id = resultItem.keyInfo.id;
    !newElOption.type && existElOption && (newElOption.type = existElOption.type);

    // Set parent id if not specified
    if (newElOption.parentId == null) {
        var newElParentOption = newElOption.parentOption;
        if (newElParentOption) {
            newElOption.parentId = newElParentOption.id;
        }
        else if (existElOption) {
            newElOption.parentId = existElOption.parentId;
        }
    }

    // Clear
    newElOption.parentOption = null;
}

function mergeNewElOptionToExist(existList, index, newElOption) {
    // Update existing options, for `getOption` feature.
    var newElOptCopy = zrUtil.extend({}, newElOption);
    var existElOption = existList[index];

    var $action = newElOption.$action || 'merge';
    if ($action === 'merge') {
        if (existElOption) {

            if (__DEV__) {
                var newType = newElOption.type;
                zrUtil.assert(
                    !newType || existElOption.type === newType,
                    'Please set $action: "replace" to change `type`'
                );
            }

            // We can ensure that newElOptCopy and existElOption are not
            // the same object, so `merge` will not change newElOptCopy.
            zrUtil.merge(existElOption, newElOptCopy, true);
            // Rigid body, use ignoreSize.
            layoutUtil.mergeLayoutParam(existElOption, newElOptCopy, {ignoreSize: true});
            // Will be used in render.
            layoutUtil.copyLayoutParams(newElOption, existElOption);
        }
        else {
            existList[index] = newElOptCopy;
        }
    }
    else if ($action === 'replace') {
        existList[index] = newElOptCopy;
    }
    else if ($action === 'remove') {
        // null will be cleaned later.
        existElOption && (existList[index] = null);
    }
}

function setLayoutInfoToExist(existItem, newElOption) {
    if (!existItem) {
        return;
    }
    existItem.hv = newElOption.hv = [
        // Rigid body, dont care `width`.
        isSetLoc(newElOption, ['left', 'right']),
        // Rigid body, dont care `height`.
        isSetLoc(newElOption, ['top', 'bottom'])
    ];
    // Give default group size. Otherwise layout error may occur.
    if (existItem.type === 'group') {
        existItem.width == null && (existItem.width = newElOption.width = 0);
        existItem.height == null && (existItem.height = newElOption.height = 0);
    }
}