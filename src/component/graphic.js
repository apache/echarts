define(function(require) {

    var echarts = require('../echarts');
    var zrUtil = require('zrender/core/util');
    var modelUtil = require('../util/model');
    var graphicUtil = require('../util/graphic');
    var formatUtil = require('../util/format');

    // Preprocessor
    echarts.registerPreprocessor(function (option) {
        var graphicOption = option && option.graphic;

        // Only one graphic instance can be instantiated. Convert
        // {
        //      graphic: [{type: 'circle'}, ...]
        // }
        // or
        // {
        //      graphic: {type: 'circle'}
        // }
        // to
        // {
        //      graphic: [{
        //          elements: [{type: 'circle'}, ...]
        //      }]
        // }
        if (zrUtil.isArray(graphicOption)
            && (!graphicOption[0] || !graphicOption[0].elements)
        ) {
            option.graphic = [{elements: graphicOption}];
        }
        else if (graphicOption && !graphicOption.elements) {
            option.graphic = [{elements: [graphicOption]}];
        }
    });

    // Model
    echarts.extendComponentModel({

        type: 'graphic',

        defaultOption: {
            elements: []
        },

        /**
         * Save for performance (only update needed graphics).
         * @private
         * @type {Array.<Object>}
         */
        _elOptionsToUpdate: null,

        /**
         * @override
         */
        mergeOption: function () {
            // Prevent default merge
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
                var existElOption = resultItem.exist;
                var newElOption = resultItem.option;

                if (__DEV__) {
                    zrUtil.assert(
                        zrUtil.isObject(newElOption) || existElOption,
                        'Empty graphic option definition'
                    );
                }

                if (!newElOption) {
                    return;
                }

                // Set id and parent id after id assigned.
                newElOption.id = resultItem.keyInfo.id;
                newElOption.parent = newElOption.parent // parent specified
                    ? newElOption.parent.id
                    : (existElOption && existElOption.parent != null) // parent not specified
                    ? existElOption.parent
                    : null;
                elOptionsToUpdate.push(newElOption);

                // Update existing options, for `getOption` feature.
                var newElOptCopy = zrUtil.extend({}, newElOption); // Avoid modified.
                var $action = newElOption.$action;
                if (!$action || $action === 'merge') {
                    existElOption
                        ? zrUtil.merge(existElOption, newElOptCopy, true)
                        : (existList[index] = newElOptCopy);
                }
                else if ($action === 'replace') {
                    existList[index] = newElOptCopy;
                }
                else if ($action === 'remove') {
                    // null will be cleaned later.
                    existElOption && (existList[index] = null);
                }

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
         *  {type: 'circle', parent: 'xx'},
         *  {type: 'polygon', parent: 'xx'}
         * ]
         * @private
         */
        _flatten: function (optionList, result, parent) {
            zrUtil.each(optionList, function (option) {
                if (option) {
                    if (parent) {
                        option.parent = parent;
                    }

                    result.push(option);

                    var children = option.children;
                    if (option.type === 'group' && children) {
                        this._flatten(children, result, option);
                    }
                    // For JSON output, and do not affect group creation.
                    delete option.children;
                }
            }, this);
        },

        /**
         * @return {Object}
         */
        getElOptionsToUpdate: function () {
            return this._elOptionsToUpdate;
        }
    });

    // View
    echarts.extendComponentView({

        type: 'graphic',

        /**
         * @override
         */
        init: function (ecModel, api) {

            /**
             * @type {Object}
             */
            this._elMap = {};
        },

        /**
         * @override
         */
        render: function (graphicModel) {
            var elOptionsToUpdate = graphicModel.getElOptionsToUpdate();
            var elMap = this._elMap;
            var rootGroup = this.group;

            zrUtil.each(elOptionsToUpdate, function (elOption) {
                var $action = elOption.$action;
                var id = elOption.id;
                var existEl = elMap[id];
                var parentId = elOption.parent;
                var targetElParent = parentId != null ? elMap[parentId] : rootGroup;

                // Remove unnecessary props to avoid potential problem.
                elOption = zrUtil.extend({}, elOption);
                delete elOption.id;
                delete elOption.parent;
                delete elOption.$action;

                if (!$action || $action === 'merge') {
                    if (existEl) {
                        existEl.attr(elOption);
                        if (targetElParent !== existEl.parent) {
                            removeEl(id, existEl, elMap);
                            targetElParent.add(existEl);
                        }
                    }
                    else {
                        createEl(id, targetElParent, elOption, elMap);
                    }
                }
                else if ($action === 'replace') {
                    removeEl(id, existEl, elMap);
                    createEl(id, targetElParent, elOption, elMap);
                }
                else if ($action === 'remove') {
                    removeEl(id, existEl, elMap);
                }
            });
        },

        /**
         * @override
         */
        dispose: function () {
            this._elMap = {};
        }
    });

    function createEl(id, targetElParent, elOption, elMap) {
        var graphicType = elOption.type;

        if (__DEV__) {
            zrUtil.assert(graphicType, 'graphic type MUST be set');
        }

        var Clz = graphicUtil[formatUtil.toCamelCase(graphicType, true)];

        if (__DEV__) {
            zrUtil.assert(Clz, 'graphic type can not be found');
        }

        var el = new Clz(elOption);
        targetElParent.add(el);
        elMap[id] = el;
    }

    function removeEl(id, existEl, elMap) {
        var existElParent = existEl && existEl.parent;
        if (existElParent) {
            existElParent.remove(existEl);
            delete elMap[id];
        }
    }
});