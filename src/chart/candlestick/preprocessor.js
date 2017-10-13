import {util as zrUtil} from 'zrender';

export default function (option) {
    if (!option || !zrUtil.isArray(option.series)) {
        return;
    }

    // Translate 'k' to 'candlestick'.
    zrUtil.each(option.series, function (seriesItem) {
        if (zrUtil.isObject(seriesItem) && seriesItem.type === 'k') {
            seriesItem.type = 'candlestick';
        }
    });
}
