import {isArray, isString} from 'zrender/src/core/util';
import {getDataItemValue} from '../../util/model';

// The rule should not be complex, otherwise user might not
// be able to known where the data is wrong.
export default function (data, dimIndex) {
    for (var i = 0, len = data.length; i < len; i++) {
        var value = getDataItemValue(data[i]);

        if (!isArray(value)) {
            return false;
        }

        var value = value[dimIndex];
        // Consider usage convenience, '1', '2' will be treated as "number".
        // `isFinit('')` get `true`.
        if (value != null && isFinite(value) && value !== '') {
            return false;
        }
        else if (isString(value) && value !== '-') {
            return true;
        }
    }
    return false;
}
