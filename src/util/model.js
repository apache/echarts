define(function(require) {

    var formatUtil = require('./format');
    var nubmerUtil = require('./number');
    var Model = require('../model/Model');
    var zrUtil = require('zrender/core/util');

    var AXIS_DIMS = ['x', 'y', 'z', 'radius', 'angle'];

    var modelUtil = {};

    /**
     * Create "each" method to iterate names.
     *
     * @pubilc
     * @param  {Array.<string>} names
     * @param  {Array.<string>=} attrs
     * @return {Function}
     */
    modelUtil.createNameEach = function (names, attrs) {
        names = names.slice();
        var capitalNames = zrUtil.map(names, modelUtil.capitalFirst);
        attrs = (attrs || []).slice();
        var capitalAttrs = zrUtil.map(attrs, modelUtil.capitalFirst);

        return function (callback, context) {
            zrUtil.each(names, function (name, index) {
                var nameObj = {name: name, capital: capitalNames[index]};

                for (var j = 0; j < attrs.length; j++) {
                    nameObj[attrs[j]] = name + capitalAttrs[j];
                }

                callback.call(context, nameObj);
            });
        };
    };

    /**
     * @public
     */
    modelUtil.capitalFirst = function (str) {
        return str ? str.charAt(0).toUpperCase() + str.substr(1) : str;
    };

    /**
     * Iterate each dimension name.
     *
     * @public
     * @param {Function} callback The parameter is like:
     *                            {
     *                                name: 'angle',
     *                                capital: 'Angle',
     *                                axis: 'angleAxis',
     *                                axisIndex: 'angleAixs',
     *                                index: 'angleIndex'
     *                            }
     * @param {Object} context
     */
    modelUtil.eachAxisDim = modelUtil.createNameEach(AXIS_DIMS, ['axisIndex', 'axis', 'index']);

    /**
     * If value is not array, then translate it to array.
     * @param  {*} value
     * @return {Array} [value] or value
     */
    modelUtil.normalizeToArray = function (value) {
        return value instanceof Array
            ? value
            : value == null
            ? []
            : [value];
    };

    /**
     * If tow dataZoomModels has the same axis controlled, we say that they are 'linked'.
     * dataZoomModels and 'links' make up one or more graphics.
     * This function finds the graphic where the source dataZoomModel is in.
     *
     * @public
     * @param {Function} forEachNode Node iterator.
     * @param {Function} forEachEdgeType edgeType iterator
     * @param {Function} edgeIdGetter Giving node and edgeType, return an array of edge id.
     * @return {Function} Input: sourceNode, Output: Like {nodes: [], dims: {}}
     */
    modelUtil.createLinkedNodesFinder = function (forEachNode, forEachEdgeType, edgeIdGetter) {

        return function (sourceNode) {
            var result = {
                nodes: [],
                records: {} // key: edgeType.name, value: Object (key: edge id, value: boolean).
            };

            forEachEdgeType(function (edgeType) {
                result.records[edgeType.name] = {};
            });

            if (!sourceNode) {
                return result;
            }

            absorb(sourceNode, result);

            var existsLink;
            do {
                existsLink = false;
                forEachNode(processSingleNode);
            }
            while (existsLink);

            function processSingleNode(node) {
                if (!isNodeAbsorded(node, result) && isLinked(node, result)) {
                    absorb(node, result);
                    existsLink = true;
                }
            }

            return result;
        };

        function isNodeAbsorded(node, result) {
            return zrUtil.indexOf(result.nodes, node) >= 0;
        }

        function isLinked(node, result) {
            var hasLink = false;
            forEachEdgeType(function (edgeType) {
                zrUtil.each(edgeIdGetter(node, edgeType) || [], function (edgeId) {
                    result.records[edgeType.name][edgeId] && (hasLink = true);
                });
            });
            return hasLink;
        }

        function absorb(node, result) {
            result.nodes.push(node);
            forEachEdgeType(function (edgeType) {
                zrUtil.each(edgeIdGetter(node, edgeType) || [], function (edgeId) {
                    result.records[edgeType.name][edgeId] = true;
                });
            });
        }
    };

    /**
     * Sync default option between normal and emphasis like `position` and `show`
     * In case some one will write code like
     *     label: {
     *         normal: {
     *             show: false,
     *             position: 'outside',
     *             textStyle: {
     *                 fontSize: 18
     *             }
     *         },
     *         emphasis: {
     *             show: true
     *         }
     *     }
     * @param {Object} opt
     * @param {Array.<string>} subOpts
     */
     modelUtil.defaultEmphasis = function (opt, subOpts) {
        if (opt) {
            var emphasisOpt = opt.emphasis = opt.emphasis || {};
            var normalOpt = opt.normal = opt.normal || {};

            // Default emphasis option from normal
            zrUtil.each(subOpts, function (subOptName) {
                var val = zrUtil.retrieve(emphasisOpt[subOptName], normalOpt[subOptName]);
                if (val != null) {
                    emphasisOpt[subOptName] = val;
                }
            });
        }
    };

    modelUtil.LABEL_OPTIONS = ['position', 'show', 'textStyle', 'distance', 'formatter'];

    /**
     * data could be [12, 2323, {value: 223}, [1221, 23], {value: [2, 23]}]
     * This helper method retieves value from data.
     * @param {string|number|Date|Array|Object} dataItem
     * @return {number|string|Date|Array.<number|string|Date>}
     */
    modelUtil.getDataItemValue = function (dataItem) {
        // Performance sensitive.
        return dataItem && (dataItem.value == null ? dataItem : dataItem.value);
    };

    /**
     * data could be [12, 2323, {value: 223}, [1221, 23], {value: [2, 23]}]
     * This helper method determine if dataItem has extra option besides value
     * @param {string|number|Date|Array|Object} dataItem
     */
    modelUtil.isDataItemOption = function (dataItem) {
        return zrUtil.isObject(dataItem)
            && !(dataItem instanceof Array);
            // // markLine data can be array
            // && !(dataItem[0] && zrUtil.isObject(dataItem[0]) && !(dataItem[0] instanceof Array));
    };

    /**
     * This helper method convert value in data.
     * @param {string|number|Date} value
     * @param {Object|string} [dimInfo] If string (like 'x'), dimType defaults 'number'.
     */
    modelUtil.converDataValue = function (value, dimInfo) {
        // Performance sensitive.
        var dimType = dimInfo && dimInfo.type;
        if (dimType === 'ordinal') {
            return value;
        }

        if (dimType === 'time' && !isFinite(value) && value != null && value !== '-') {
            value = +nubmerUtil.parseDate(value);
        }

        // dimType defaults 'number'.
        // If dimType is not ordinal and value is null or undefined or NaN or '-',
        // parse to NaN.
        return (value == null || value === '')
            ? NaN : +value; // If string (like '-'), using '+' parse to NaN
    };

    /**
     * Create a model proxy to be used in tooltip for edge data, markLine data, markPoint data.
     * @param {module:echarts/data/List} data
     * @param {Object} opt
     * @param {string} [opt.seriesIndex]
     * @param {Object} [opt.name]
     * @param {Object} [opt.mainType]
     * @param {Object} [opt.subType]
     */
    modelUtil.createDataFormatModel = function (data, opt) {
        var model = new Model();
        zrUtil.mixin(model, modelUtil.dataFormatMixin);
        model.seriesIndex = opt.seriesIndex;
        model.name = opt.name || '';
        model.mainType = opt.mainType;
        model.subType = opt.subType;

        model.getData = function () {
            return data;
        };
        return model;
    };

    // PENDING A little ugly
    modelUtil.dataFormatMixin = {
        /**
         * Get params for formatter
         * @param {number} dataIndex
         * @param {string} [dataType]
         * @return {Object}
         */
        getDataParams: function (dataIndex, dataType) {
            var data = this.getData(dataType);

            var seriesIndex = this.seriesIndex;
            var seriesName = this.name;

            var rawValue = this.getRawValue(dataIndex, dataType);
            var rawDataIndex = data.getRawIndex(dataIndex);
            var name = data.getName(dataIndex, true);
            var itemOpt = data.getRawDataItem(dataIndex);

            return {
                componentType: this.mainType,
                componentSubType: this.subType,
                seriesType: this.mainType === 'series' ? this.subType : null,
                seriesIndex: seriesIndex,
                seriesName: seriesName,
                name: name,
                dataIndex: rawDataIndex,
                data: itemOpt,
                dataType: dataType,
                value: rawValue,
                color: data.getItemVisual(dataIndex, 'color'),

                // Param name list for mapping `a`, `b`, `c`, `d`, `e`
                $vars: ['seriesName', 'name', 'value']
            };
        },

        /**
         * Format label
         * @param {number} dataIndex
         * @param {string} [status='normal'] 'normal' or 'emphasis'
         * @param {string} [dataType]
         * @param {number} [dimIndex]
         * @return {string}
         */
        getFormattedLabel: function (dataIndex, status, dataType, dimIndex) {
            status = status || 'normal';
            var data = this.getData(dataType);
            var itemModel = data.getItemModel(dataIndex);

            var params = this.getDataParams(dataIndex, dataType);
            if (dimIndex != null && (params.value instanceof Array)) {
                params.value = params.value[dimIndex];
            }

            var formatter = itemModel.get(['label', status, 'formatter']);

            if (typeof formatter === 'function') {
                params.status = status;
                return formatter(params);
            }
            else if (typeof formatter === 'string') {
                return formatUtil.formatTpl(formatter, params);
            }
        },

        /**
         * Get raw value in option
         * @param {number} idx
         * @param {string} [dataType]
         * @return {Object}
         */
        getRawValue: function (idx, dataType) {
            var data = this.getData(dataType);
            var dataItem = data.getRawDataItem(idx);
            if (dataItem != null) {
                return (zrUtil.isObject(dataItem) && !(dataItem instanceof Array))
                    ? dataItem.value : dataItem;
            }
        },

        /**
         * Should be implemented.
         * @param {number} dataIndex
         * @param {boolean} [multipleSeries=false]
         * @param {number} [dataType]
         * @return {string} tooltip string
         */
        formatTooltip: zrUtil.noop
    };

    /**
     * Mapping to exists for merge.
     *
     * @public
     * @param {Array.<Object>|Array.<module:echarts/model/Component>} exists
     * @param {Object|Array.<Object>} newCptOptions
     * @return {Array.<Object>} Result, like [{exist: ..., option: ...}, {}],
     *                          which order is the same as exists.
     */
    modelUtil.mappingToExists = function (exists, newCptOptions) {
        // Mapping by the order by original option (but not order of
        // new option) in merge mode. Because we should ensure
        // some specified index (like xAxisIndex) is consistent with
        // original option, which is easy to understand, espatially in
        // media query. And in most case, merge option is used to
        // update partial option but not be expected to change order.
        newCptOptions = (newCptOptions || []).slice();

        var result = zrUtil.map(exists || [], function (obj, index) {
            return {exist: obj};
        });

        // Mapping by id or name if specified.
        zrUtil.each(newCptOptions, function (cptOption, index) {
            if (!zrUtil.isObject(cptOption)) {
                return;
            }

            // id has highest priority.
            for (var i = 0; i < result.length; i++) {
                if (!result[i].option // Consider name: two map to one.
                    && cptOption.id != null
                    && result[i].exist.id === cptOption.id + ''
                ) {
                    result[i].option = cptOption;
                    newCptOptions[index] = null;
                    return;
                }
            }

            for (var i = 0; i < result.length; i++) {
                var exist = result[i].exist;
                if (!result[i].option // Consider name: two map to one.
                    // Can not match when both ids exist but different.
                    && (exist.id == null || cptOption.id == null)
                    && cptOption.name != null
                    && !modelUtil.isIdInner(cptOption)
                    && !modelUtil.isIdInner(exist)
                    && exist.name === cptOption.name + ''
                ) {
                    result[i].option = cptOption;
                    newCptOptions[index] = null;
                    return;
                }
            }
        });

        // Otherwise mapping by index.
        zrUtil.each(newCptOptions, function (cptOption, index) {
            if (!zrUtil.isObject(cptOption)) {
                return;
            }

            var i = 0;
            for (; i < result.length; i++) {
                var exist = result[i].exist;
                if (!result[i].option
                    && !modelUtil.isIdInner(exist)
                    // Caution:
                    // Do not overwrite id. But name can be overwritten,
                    // because axis use name as 'show label text'.
                    // 'exist' always has id and name and we dont
                    // need to check it.
                    && cptOption.id == null
                ) {
                    result[i].option = cptOption;
                    break;
                }
            }

            if (i >= result.length) {
                result.push({option: cptOption});
            }
        });

        return result;
    };

    /**
     * @public
     * @param {Object} cptOption
     * @return {boolean}
     */
    modelUtil.isIdInner = function (cptOption) {
        return zrUtil.isObject(cptOption)
            && cptOption.id
            && (cptOption.id + '').indexOf('\0_ec_\0') === 0;
    };

    /**
     * A helper for removing duplicate items between batchA and batchB,
     * and in themselves, and categorize by series.
     *
     * @param {Array.<Object>} batchA Like: [{seriesId: 2, dataIndex: [32, 4, 5]}, ...]
     * @param {Array.<Object>} batchB Like: [{seriesId: 2, dataIndex: [32, 4, 5]}, ...]
     * @return {Array.<Array.<Object>, Array.<Object>>} result: [resultBatchA, resultBatchB]
     */
    modelUtil.compressBatches = function (batchA, batchB) {
        var mapA = {};
        var mapB = {};

        makeMap(batchA || [], mapA);
        makeMap(batchB || [], mapB, mapA);

        return [mapToArray(mapA), mapToArray(mapB)];

        function makeMap(sourceBatch, map, otherMap) {
            for (var i = 0, len = sourceBatch.length; i < len; i++) {
                var seriesId = sourceBatch[i].seriesId;
                var dataIndices = modelUtil.normalizeToArray(sourceBatch[i].dataIndex);
                var otherDataIndices = otherMap && otherMap[seriesId];

                for (var j = 0, lenj = dataIndices.length; j < lenj; j++) {
                    var dataIndex = dataIndices[j];

                    if (otherDataIndices && otherDataIndices[dataIndex]) {
                        otherDataIndices[dataIndex] = null;
                    }
                    else {
                        (map[seriesId] || (map[seriesId] = {}))[dataIndex] = 1;
                    }
                }
            }
        }

        function mapToArray(map, isData) {
            var result = [];
            for (var i in map) {
                if (map.hasOwnProperty(i) && map[i] != null) {
                    if (isData) {
                        result.push(+i);
                    }
                    else {
                        var dataIndices = mapToArray(map[i], true);
                        dataIndices.length && result.push({seriesId: i, dataIndex: dataIndices});
                    }
                }
            }
            return result;
        }
    };

    return modelUtil;
});