import {createHashMap, isObject, map} from 'zrender/src/core/util';

var MULTIPLE_SOURCE = 'multiple_source';
// Used to avoid null/undefined comparison.
var NO_SOURCE = 'no_source';

/**
 * @constructor
 * @param {module:echart/model/Model} axisModel
 */
function OrdinalMeta(axisModel) {

    var data = axisModel.option.data;
    var categories = data && map(data, getName);

    /**
     * @readOnly
     * @type {Array.<string>}
     */
    this.categories = categories || [];

    /**
     * @private
     * @type {boolean}
     */
    this._needCollect = !categories;

    /**
     * @private
     * @type {boolean}
     */
    this._preventDeduplication = axisModel.get('dedplication', true) === false;

    /**
     * @private
     * @type {boolean}
     */
    this._map;
}

var proto = OrdinalMeta.prototype;

/**
 * @param {string} category
 * @return {number} ordinal
 */
proto.getOrdinal = function (category) {
    return getOrCreateMap(this).get(category);
};

/**
 * @param {string} category
 * @return {number} The ordinal. If not found, return NaN.
 */
proto.parseAndCollect = function (category) {
    var index;
    var needCollect = this._needCollect;

    // Optimize for the scenario:
    // category is ['2012-01-01', '2012-01-02', ...], where the input
    // data has been ensured not duplicate and is large data.
    // Notice, if a dataset dimension provide categroies, usually echarts
    // should remove duplication except user tell echarts dont do that
    // (set axis.deduplication = false), because echarts do not know whether
    // the values in the category dimension has duplication (consider the
    // parallel-aqi example)
    if (needCollect && this._preventDeduplication) {
        index = this.categories.length;
        this.categories[index] = category;
        return index;
    }

    var map = getOrCreateMap(this);
    index = map.get(category);

    if (index == null) {
        if (needCollect) {
            index = this.categories.length;
            this.categories[index] = category;
            map.set(category, index);
        }
        else {
            index = NaN;
        }
    }

    return index;
};

// Do not create map until needed.
function getOrCreateMap(ordinalMeta) {
    return ordinalMeta._map || (
        ordinalMeta._map = createHashMap(ordinalMeta.categories)
    );
}

function getName(obj) {
    if (isObject(obj) && obj.value != null) {
        return obj.value;
    }
    else {
        return obj + '';
    }
}

export default OrdinalMeta;
