define(function(require) {

    var formatUtil = require('./format');
    var nubmerUtil = require('./number');
    var Model = require('../model/Model');
    var zrUtil = require('zrender/core/util');
    var each = zrUtil.each;
    var isObject = zrUtil.isObject;

    var modelUtil = {};

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
            each(subOpts, function (subOptName) {
                var val = zrUtil.retrieve(emphasisOpt[subOptName], normalOpt[subOptName]);
                if (val != null) {
                    emphasisOpt[subOptName] = val;
                }
            });
        }
    };

    modelUtil.LABEL_OPTIONS = ['position', 'offset', 'show', 'textStyle', 'distance', 'formatter'];

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
        return isObject(dataItem)
            && !(dataItem instanceof Array);
            // // markLine data can be array
            // && !(dataItem[0] && isObject(dataItem[0]) && !(dataItem[0] instanceof Array));
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

        if (dimType === 'time'
            // spead up when using timestamp
            && typeof value !== 'number'
            && value != null
            && value !== '-'
        ) {
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
            var rawValue = this.getRawValue(dataIndex, dataType);
            var rawDataIndex = data.getRawIndex(dataIndex);
            var name = data.getName(dataIndex, true);
            var itemOpt = data.getRawDataItem(dataIndex);

            return {
                componentType: this.mainType,
                componentSubType: this.subType,
                seriesType: this.mainType === 'series' ? this.subType : null,
                seriesIndex: this.seriesIndex,
                seriesId: this.id,
                seriesName: this.name,
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
                return (isObject(dataItem) && !(dataItem instanceof Array))
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
     *                          index of which is the same as exists.
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
        each(newCptOptions, function (cptOption, index) {
            if (!isObject(cptOption)) {
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
        each(newCptOptions, function (cptOption, index) {
            if (!isObject(cptOption)) {
                return;
            }

            var i = 0;
            for (; i < result.length; i++) {
                var exist = result[i].exist;
                if (!result[i].option
                    // Existing model that already has id should be able to
                    // mapped to (because after mapping performed model may
                    // be assigned with a id, whish should not affect next
                    // mapping), except those has inner id.
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
     * Make id and name for mapping result (result of mappingToExists)
     * into `keyInfo` field.
     *
     * @public
     * @param {Array.<Object>} Result, like [{exist: ..., option: ...}, {}],
     *                          which order is the same as exists.
     * @return {Array.<Object>} The input.
     */
    modelUtil.makeIdAndName = function (mapResult) {
        // We use this id to hash component models and view instances
        // in echarts. id can be specified by user, or auto generated.

        // The id generation rule ensures new view instance are able
        // to mapped to old instance when setOption are called in
        // no-merge mode. So we generate model id by name and plus
        // type in view id.

        // name can be duplicated among components, which is convenient
        // to specify multi components (like series) by one name.

        // Ensure that each id is distinct.
        var idMap = {};

        each(mapResult, function (item, index) {
            var existCpt = item.exist;
            existCpt && (idMap[existCpt.id] = item);
        });

        each(mapResult, function (item, index) {
            var opt = item.option;

            zrUtil.assert(
                !opt || opt.id == null || !idMap[opt.id] || idMap[opt.id] === item,
                'id duplicates: ' + (opt && opt.id)
            );

            opt && opt.id != null && (idMap[opt.id] = item);
            !item.keyInfo && (item.keyInfo = {});
        });

        // Make name and id.
        each(mapResult, function (item, index) {
            var existCpt = item.exist;
            var opt = item.option;
            var keyInfo = item.keyInfo;

            if (!isObject(opt)) {
                return;
            }

            // name can be overwitten. Consider case: axis.name = '20km'.
            // But id generated by name will not be changed, which affect
            // only in that case: setOption with 'not merge mode' and view
            // instance will be recreated, which can be accepted.
            keyInfo.name = opt.name != null
                ? opt.name + ''
                : existCpt
                ? existCpt.name
                : '\0-'; // name may be displayed on screen, so use '-'.

            if (existCpt) {
                keyInfo.id = existCpt.id;
            }
            else if (opt.id != null) {
                keyInfo.id = opt.id + '';
            }
            else {
                // Consider this situatoin:
                //  optionA: [{name: 'a'}, {name: 'a'}, {..}]
                //  optionB [{..}, {name: 'a'}, {name: 'a'}]
                // Series with the same name between optionA and optionB
                // should be mapped.
                var idNum = 0;
                do {
                    keyInfo.id = '\0' + keyInfo.name + '\0' + idNum++;
                }
                while (idMap[keyInfo.id]);
            }

            idMap[keyInfo.id] = item;
        });
    };

    /**
     * @public
     * @param {Object} cptOption
     * @return {boolean}
     */
    modelUtil.isIdInner = function (cptOption) {
        return isObject(cptOption)
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

    /**
     * @param {module:echarts/data/List} data
     * @param {Object} payload Contains dataIndex (means rawIndex) / dataIndexInside / name
     *                         each of which can be Array or primary type.
     * @return {number|Array.<number>} dataIndex If not found, return undefined/null.
     */
    modelUtil.queryDataIndex = function (data, payload) {
        if (payload.dataIndexInside != null) {
            return payload.dataIndexInside;
        }
        else if (payload.dataIndex != null) {
            return zrUtil.isArray(payload.dataIndex)
                ? zrUtil.map(payload.dataIndex, function (value) {
                    return data.indexOfRawIndex(value);
                })
                : data.indexOfRawIndex(payload.dataIndex);
        }
        else if (payload.name != null) {
            return zrUtil.isArray(payload.name)
                ? zrUtil.map(payload.name, function (value) {
                    return data.indexOfName(value);
                })
                : data.indexOfName(payload.name);
        }
    };

    /**
     * Enable property storage to any host object.
     * Notice: Serialization is not supported.
     *
     * For example:
     * var get = modelUitl.makeGetter();
     *
     * function some(hostObj) {
     *      get(hostObj)._someProperty = 1212;
     *      ...
     * }
     *
     * @return {Function}
     */
    modelUtil.makeGetter = (function () {
        var index = 0;
        return function () {
            var key = '\0__ec_prop_getter_' + index++;
            return function (hostObj) {
                return hostObj[key] || (hostObj[key] = {});
            };
        };
    })();

    /**
     * @param {module:echarts/model/Global} ecModel
     * @param {string|Object} finder
     *        If string, e.g., 'geo', means {geoIndex: 0}.
     *        If Object, could contain some of these properties below:
     *        {
     *            seriesIndex, seriesId, seriesName,
     *            geoIndex, geoId, geoName,
     *            bmapIndex, bmapId, bmapName,
     *            xAxisIndex, xAxisId, xAxisName,
     *            yAxisIndex, yAxisId, yAxisName,
     *            gridIndex, gridId, gridName,
     *            ... (can be extended)
     *        }
     *        Each properties can be number|string|Array.<number>|Array.<string>
     *        For example, a finder could be
     *        {
     *            seriesIndex: 3,
     *            geoId: ['aa', 'cc'],
     *            gridName: ['xx', 'rr']
     *        }
     *        xxxIndex can be set as 'all' (means all xxx) or 'none' (means not specify)
     *        If nothing or null/undefined specified, return nothing.
     * @param {Object} [opt]
     * @param {string} [opt.defaultMainType]
     * @param {Array.<string>} [opt.includeMainTypes]
     * @return {Object} result like:
     *        {
     *            seriesModels: [seriesModel1, seriesModel2],
     *            seriesModel: seriesModel1, // The first model
     *            geoModels: [geoModel1, geoModel2],
     *            geoModel: geoModel1, // The first model
     *            ...
     *        }
     */
    modelUtil.parseFinder = function (ecModel, finder, opt) {
        if (zrUtil.isString(finder)) {
            var obj = {};
            obj[finder + 'Index'] = 0;
            finder = obj;
        }

        var defaultMainType = opt && opt.defaultMainType;
        if (defaultMainType
            && !has(finder, defaultMainType + 'Index')
            && !has(finder, defaultMainType + 'Id')
            && !has(finder, defaultMainType + 'Name')
        ) {
            finder[defaultMainType + 'Index'] = 0;
        }

        var result = {};

        each(finder, function (value, key) {
            var value = finder[key];

            // Exclude 'dataIndex' and other illgal keys.
            if (key === 'dataIndex' || key === 'dataIndexInside') {
                result[key] = value;
                return;
            }

            var parsedKey = key.match(/^(\w+)(Index|Id|Name)$/) || [];
            var mainType = parsedKey[1];
            var queryType = (parsedKey[2] || '').toLowerCase();

            if (!mainType
                || !queryType
                || value == null
                || (queryType === 'index' && value === 'none')
                || (opt && opt.includeMainTypes && zrUtil.indexOf(opt.includeMainTypes, mainType) < 0)
            ) {
                return;
            }

            var queryParam = {mainType: mainType};
            if (queryType !== 'index' || value !== 'all') {
                queryParam[queryType] = value;
            }

            var models = ecModel.queryComponents(queryParam);
            result[mainType + 'Models'] = models;
            result[mainType + 'Model'] = models[0];
        });

        return result;
    };

    function has(obj, prop) {
        return obj && obj.hasOwnProperty(prop);
    }

    return modelUtil;
});
