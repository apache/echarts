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
     * @type {string}
     */
    this._sourceModelUID = categories ? axisModel.uid : NO_SOURCE;

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
 * @param {string} [dimSourceModelUID]
 * @return {number} The ordinal. If not found, return NaN.
 */
proto.parseAndCollect = function (category, dimSourceModelUID) {
    var index;
    var needCollect = this._needCollect;

    // Optimize for the scenario: Only a dataset dimension provide categroies
    // and many series use the dimension. We avoid to create map.
    if (needCollect && dimSourceModelUID === this._sourceModelUID) {
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

proto.prepareDimInfo = function (dimInfo, source) {
    dimInfo.ordinalMeta = this;
    addSourceModelUID(this, source.modelUID);
    dimInfo.sourceModelUID = source.modelUID;
};

/**
 * Consider these cases:
 * (1) A category axis provides data (categories) and
 * many series refer the axis.
 * (2) Only a dataset dimension provide categroies and many
 * series use the dimension.
 *
 * In those cases above, categoryMap is not needed to be
 * created. So we use sourceModelUID to make this optimization.
 * @private
 */
function addSourceModelUID(ordinalMeta, sourceModelUID) {
    if (ordinalMeta._needCollect) {
        ordinalMeta._sourceModelUID = ordinalMeta._sourceModelUID === NO_SOURCE
            ? sourceModelUID
            : MULTIPLE_SOURCE;
    }
};

// Do not create map until needed.
function getOrCreateMap(ordinalMeta) {
    return ordinalMeta._map || (
        ordinalMeta._map = createHashMap(ordinalMeta.categories)
    );
};

function getName(obj) {
    if (isObject(obj) && obj.value != null) {
        return obj.value;
    }
    else {
        return obj + '';
    }
}

export default OrdinalMeta;
