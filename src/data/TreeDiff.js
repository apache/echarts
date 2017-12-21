import * as zrUtil from 'zrender/src/core/util';
import DataDiff from './DataDiffer';

/**
 * @param {Array} oldArr
 * @param {Array} newArr
 * @param {Function} oldKeyGetter
 * @param {Function} newKeyGetter
 * @param {Object} [context] Can be visited by this.context in callback.
 */
function TreeDiff(oldArr, newArr, oldKeyGetter, newKeyGetter, context) {
    DataDiff.apply(this, arguments);
}

TreeDiff.prototype._initIndexMap = function (
    arr, map, keyArr, keyGetterName, dataDiffer
) {
    for (var i = 0; i < arr.length; i++) {
        // Add prefix to avoid conflict with Object.prototype.
        var key = '_ec_' + dataDiffer[keyGetterName](arr[i], i);
        var existence = map[key];
        if (existence == null) {
            map[key] = keyArr.length;
            keyArr.push(key);
        }
        else {
            if (!existence.length) {
                map[key] = existence = [existence];
            }
            existence.push(i);
        }

        if (arr[i].children && arr[i].children.length > 0) {
            this._initIndexMap(
                arr[i].children, map, keyArr, keyGetterName, dataDiffer
            );
        }
    }
};

zrUtil.inherits(TreeDiff, DataDiff);

export default TreeDiff;
