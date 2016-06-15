/**
 * @file Visual solution, for consistent option specification.
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var VisualMapping = require('./VisualMapping');
    var each = zrUtil.each;

    var visualSolution = {

        /**
         * @param {Object} option
         * @param {Array.<string>} stateList
         * @param {Function} [supplementVisualOption]
         * @return {Object} visualMappings <state, <visualType, module:echarts/visual/VisualMapping>>
         */
        createVisualMappings: function (option, stateList, supplementVisualOption) {
            var visualMappings = {};

            each(stateList, function (state) {
                var mappings = visualMappings[state] = createMappings();

                each(option[state], function (visualData, visualType) {
                    if (!VisualMapping.isValidType(visualType)) {
                        return;
                    }
                    var mappingOption = {
                        type: visualType,
                        visual: visualData
                    };
                    supplementVisualOption && supplementVisualOption(mappingOption, state);
                    mappings[visualType] = new VisualMapping(mappingOption);

                    // Prepare a alpha for opacity, for some case that opacity
                    // is not supported, such as rendering using gradient color.
                    if (visualType === 'opacity') {
                        mappingOption = zrUtil.clone(mappingOption);
                        mappingOption.type = 'colorAlpha';
                        mappings.__hidden.__alphaForOpacity = new VisualMapping(mappingOption);
                    }
                });
            });

            return visualMappings;

            function createMappings() {
                var Creater = function () {};
                // Make sure hidden fields will not be visited by
                // object iteration (with hasOwnProperty checking).
                Creater.prototype.__hidden = Creater.prototype;
                var obj = new Creater();
                return obj;
            }
        },

        /**
         * @param {Object} thisOption
         * @param {Object} newOption
         * @param {Array.<string>} keys
         */
        replaceVisualOption: function (thisOption, newOption, keys) {
            // Visual attributes merge is not supported, otherwise it
            // brings overcomplicated merge logic. See #2853. So if
            // newOption has anyone of these keys, all of these keys
            // will be reset. Otherwise, all keys remain.
            var has;
            zrUtil.each(keys, function (key) {
                if (newOption.hasOwnProperty(key)) {
                    has = true;
                }
            });
            has && zrUtil.each(keys, function (key) {
                if (newOption.hasOwnProperty(key)) {
                    thisOption[key] = zrUtil.clone(newOption[key]);
                }
                else {
                    delete thisOption[key];
                }
            });
        },

        /**
         * @param {Array.<string>} stateList
         * @param {Object} visualMappings <state, Object.<visualType, module:echarts/visual/VisualMapping>>
         * @param {module:echarts/data/List} list
         * @param {Function} getValueState param: valueOrIndex, return: state.
         * @param {object} [scope] Scope for getValueState
         * @param {string} [dimension] Concrete dimension, if used.
         */
        applyVisual: function (stateList, visualMappings, data, getValueState, scope, dimension) {
            var visualTypesMap = {};
            zrUtil.each(stateList, function (state) {
                var visualTypes = VisualMapping.prepareVisualTypes(visualMappings[state]);
                visualTypesMap[state] = visualTypes;
            });

            var dataIndex;

            function getVisual(key) {
                return data.getItemVisual(dataIndex, key);
            }

            function setVisual(key, value) {
                data.setItemVisual(dataIndex, key, value);
            }

            if (dimension == null) {
                data.each(eachItem, true);
            }
            else {
                data.each([dimension], eachItem, true);
            }

            function eachItem(valueOrIndex, index) {
                dataIndex = dimension == null ? valueOrIndex : index;
                var valueState = getValueState.call(scope, valueOrIndex);
                var mappings = visualMappings[valueState];
                var visualTypes = visualTypesMap[valueState];

                for (var i = 0, len = visualTypes.length; i < len; i++) {
                    var type = visualTypes[i];
                    mappings[type] && mappings[type].applyVisual(
                        valueOrIndex, getVisual, setVisual
                    );
                }
            }
        }

    };

    return visualSolution;

});