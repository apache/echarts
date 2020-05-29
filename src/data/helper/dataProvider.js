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

// TODO
// ??? refactor? check the outer usage of data provider.
// merge with defaultDimValueGetter?

import {__DEV__} from '../../config';
import {isTypedArray, extend, assert, each, isObject} from 'zrender/src/core/util';
import {getDataItemValue, isDataItemOption} from '../../util/model';
import {parseDate} from '../../util/number';
import Source from '../Source';
import {
    SOURCE_FORMAT_TYPED_ARRAY,
    SOURCE_FORMAT_ARRAY_ROWS,
    SOURCE_FORMAT_ORIGINAL,
    SOURCE_FORMAT_OBJECT_ROWS
} from './sourceType';

/**
 * If normal array used, mutable chunk size is supported.
 * If typed array used, chunk size must be fixed.
 */
export function DefaultDataProvider(source, dimSize) {
    if (!Source.isInstance(source)) {
        source = Source.seriesDataToSource(source);
    }
    this._source = source;

    var data = this._data = source.data;
    var sourceFormat = source.sourceFormat;

    // Typed array. TODO IE10+?
    if (sourceFormat === SOURCE_FORMAT_TYPED_ARRAY) {
        if (__DEV__) {
            if (dimSize == null) {
                throw new Error('Typed array data must specify dimension size');
            }
        }
        this._offset = 0;
        this._dimSize = dimSize;
        this._data = data;
    }

    var methods = providerMethods[
        sourceFormat === SOURCE_FORMAT_ARRAY_ROWS
        ? sourceFormat + '_' + source.seriesLayoutBy
        : sourceFormat
    ];

    if (__DEV__) {
        assert(methods, 'Invalide sourceFormat: ' + sourceFormat);
    }

    extend(this, methods);
}

var providerProto = DefaultDataProvider.prototype;
// If data is pure without style configuration
providerProto.pure = false;
// If data is persistent and will not be released after use.
providerProto.persistent = true;

// ???! FIXME legacy data provider do not has method getSource
providerProto.getSource = function () {
    return this._source;
};

var providerMethods = {

    'arrayRows_column': {
        pure: true,
        count: function () {
            return Math.max(0, this._data.length - this._source.startIndex);
        },
        getItem: function (idx) {
            return this._data[idx + this._source.startIndex];
        },
        appendData: appendDataSimply
    },

    'arrayRows_row': {
        pure: true,
        count: function () {
            var row = this._data[0];
            return row ? Math.max(0, row.length - this._source.startIndex) : 0;
        },
        getItem: function (idx) {
            idx += this._source.startIndex;
            var item = [];
            var data = this._data;
            for (var i = 0; i < data.length; i++) {
                var row = data[i];
                item.push(row ? row[idx] : null);
            }
            return item;
        },
        appendData: function () {
            throw new Error('Do not support appendData when set seriesLayoutBy: "row".');
        }
    },

    'objectRows': {
        pure: true,
        count: countSimply,
        getItem: getItemSimply,
        appendData: appendDataSimply
    },

    'keyedColumns': {
        pure: true,
        count: function () {
            var dimName = this._source.dimensionsDefine[0].name;
            var col = this._data[dimName];
            return col ? col.length : 0;
        },
        getItem: function (idx) {
            var item = [];
            var dims = this._source.dimensionsDefine;
            for (var i = 0; i < dims.length; i++) {
                var col = this._data[dims[i].name];
                item.push(col ? col[idx] : null);
            }
            return item;
        },
        appendData: function (newData) {
            var data = this._data;
            each(newData, function (newCol, key) {
                var oldCol = data[key] || (data[key] = []);
                for (var i = 0; i < (newCol || []).length; i++) {
                    oldCol.push(newCol[i]);
                }
            });
        }
    },

    'original': {
        count: countSimply,
        getItem: getItemSimply,
        appendData: appendDataSimply
    },

    'typedArray': {
        persistent: false,
        pure: true,
        count: function () {
            return this._data ? (this._data.length / this._dimSize) : 0;
        },
        getItem: function (idx, out) {
            idx = idx - this._offset;
            out = out || [];
            var offset = this._dimSize * idx;
            for (var i = 0; i < this._dimSize; i++) {
                out[i] = this._data[offset + i];
            }
            return out;
        },
        appendData: function (newData) {
            if (__DEV__) {
                assert(
                    isTypedArray(newData),
                    'Added data must be TypedArray if data in initialization is TypedArray'
                );
            }

            this._data = newData;
        },

        // Clean self if data is already used.
        clean: function () {
            // PENDING
            this._offset += this.count();
            this._data = null;
        }
    }
};

function countSimply() {
    return this._data.length;
}
function getItemSimply(idx) {
    return this._data[idx];
}
function appendDataSimply(newData) {
    for (var i = 0; i < newData.length; i++) {
        this._data.push(newData[i]);
    }
}



var rawValueGetters = {

    arrayRows: getRawValueSimply,

    objectRows: function (dataItem, dataIndex, dimIndex, dimName) {
        return dimIndex != null ? dataItem[dimName] : dataItem;
    },

    keyedColumns: getRawValueSimply,

    original: function (dataItem, dataIndex, dimIndex, dimName) {
        // FIXME
        // In some case (markpoint in geo (geo-map.html)), dataItem
        // is {coord: [...]}
        var value = getDataItemValue(dataItem);
        return (dimIndex == null || !(value instanceof Array))
            ? value
            : value[dimIndex];
    },

    typedArray: getRawValueSimply
};

function getRawValueSimply(dataItem, dataIndex, dimIndex, dimName) {
    return dimIndex != null ? dataItem[dimIndex] : dataItem;
}


export var defaultDimValueGetters = {

    arrayRows: getDimValueSimply,

    objectRows: function (dataItem, dimName, dataIndex, dimIndex) {
        return converDataValue(dataItem[dimName], this._dimensionInfos[dimName]);
    },

    keyedColumns: getDimValueSimply,

    original: function (dataItem, dimName, dataIndex, dimIndex) {
        // Performance sensitive, do not use modelUtil.getDataItemValue.
        // If dataItem is an plain object with no value field, the var `value`
        // will be assigned with the object, but it will be tread correctly
        // in the `convertDataValue`.
        var value = dataItem && (dataItem.value == null ? dataItem : dataItem.value);

        // If any dataItem is like { value: 10 }
        if (!this._rawData.pure && isDataItemOption(dataItem)) {
            this.hasItemOption = true;
        }
        return converDataValue(
            (value instanceof Array)
                ? value[dimIndex]
                // If value is a single number or something else not array.
                : value,
            this._dimensionInfos[dimName]
        );
    },

    typedArray: function (dataItem, dimName, dataIndex, dimIndex) {
        return dataItem[dimIndex];
    }

};

function getDimValueSimply(dataItem, dimName, dataIndex, dimIndex) {
    return converDataValue(dataItem[dimIndex], this._dimensionInfos[dimName]);
}

/**
 * This helper method convert value in data.
 * @param {string|number|Date} value
 * @param {Object|string} [dimInfo] If string (like 'x'), dimType defaults 'number'.
 *        If "dimInfo.ordinalParseAndSave", ordinal value can be parsed.
 */
function converDataValue(value, dimInfo) {
    // Performance sensitive.
    var dimType = dimInfo && dimInfo.type;
    if (dimType === 'ordinal') {
        // If given value is a category string
        var ordinalMeta = dimInfo && dimInfo.ordinalMeta;
        return ordinalMeta
            ? ordinalMeta.parseAndCollect(value)
            : value;
    }

    if (dimType === 'time'
        // spead up when using timestamp
        && typeof value !== 'number'
        && value != null
        && value !== '-'
    ) {
        value = +parseDate(value);
    }

    // dimType defaults 'number'.
    // If dimType is not ordinal and value is null or undefined or NaN or '-',
    // parse to NaN.
    return (value == null || value === '')
        ? NaN
        // If string (like '-'), using '+' parse to NaN
        // If object, also parse to NaN
        : +value;
}

// ??? FIXME can these logic be more neat: getRawValue, getRawDataItem,
// Consider persistent.
// Caution: why use raw value to display on label or tooltip?
// A reason is to avoid format. For example time value we do not know
// how to format is expected. More over, if stack is used, calculated
// value may be 0.91000000001, which have brings trouble to display.
// TODO: consider how to treat null/undefined/NaN when display?
/**
 * @param {module:echarts/data/List} data
 * @param {number} dataIndex
 * @param {string|number} [dim] dimName or dimIndex
 * @return {Array.<number>|string|number} can be null/undefined.
 */
export function retrieveRawValue(data, dataIndex, dim) {
    if (!data) {
        return;
    }

    // Consider data may be not persistent.
    var dataItem = data.getRawDataItem(dataIndex);

    if (dataItem == null) {
        return;
    }

    var sourceFormat = data.getProvider().getSource().sourceFormat;
    var dimName;
    var dimIndex;

    var dimInfo = data.getDimensionInfo(dim);
    if (dimInfo) {
        dimName = dimInfo.name;
        dimIndex = dimInfo.index;
    }

    return rawValueGetters[sourceFormat](dataItem, dataIndex, dimIndex, dimName);
}

/**
 * Compatible with some cases (in pie, map) like:
 * data: [{name: 'xx', value: 5, selected: true}, ...]
 * where only sourceFormat is 'original' and 'objectRows' supported.
 *
 * ??? TODO
 * Supported detail options in data item when using 'arrayRows'.
 *
 * @param {module:echarts/data/List} data
 * @param {number} dataIndex
 * @param {string} attr like 'selected'
 */
export function retrieveRawAttr(data, dataIndex, attr) {
    if (!data) {
        return;
    }

    var sourceFormat = data.getProvider().getSource().sourceFormat;

    if (sourceFormat !== SOURCE_FORMAT_ORIGINAL
        && sourceFormat !== SOURCE_FORMAT_OBJECT_ROWS
    ) {
        return;
    }

    var dataItem = data.getRawDataItem(dataIndex);
    if (sourceFormat === SOURCE_FORMAT_ORIGINAL && !isObject(dataItem)) {
        dataItem = null;
    }
    if (dataItem) {
        return dataItem[attr];
    }
}
