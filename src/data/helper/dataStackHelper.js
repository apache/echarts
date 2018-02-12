import {each, isString} from 'zrender/src/core/util';

/**
 * @param {module:echarts/model/Series} seriesModel
 * @param {Array.<string|Object>} dimensionInfoList The same as the input of <module:echarts/data/List>.
 *        The input dimensionInfoList will be modified.
 * @return {Object} calculationInfo
 * {
 *     stackedDimension: stackedDimInfo.name,
 *     stackedByDimension: stackedByDimension,
 *     stackedOverDimension: stackedOverDimension,
 *     stackResultDimension: stackResultDimension
 * }
 */
export function enableDataStack(seriesModel, dimensionInfoList) {
    // Compatibal: when `stack` is set as '', do not stack.
    var mayStack = !!(seriesModel && seriesModel.get('stack'));
    var stackedByDimInfo;
    var stackedDimInfo;
    var stackResultDimension;
    var stackedOverDimension;

    each(dimensionInfoList, function (dimensionInfo, index) {
        if (isString(dimensionInfo)) {
            dimensionInfoList[index] = dimensionInfo = {name: dimensionInfo};
        }

        if (mayStack && !dimensionInfo.isExtraCoord) {
            // Find the first ordinal dimension as the stackedByDimInfo.
            if (!stackedByDimInfo && dimensionInfo.ordinalMeta) {
                stackedByDimInfo = dimensionInfo;
            }
            // Find the first stackable dimension as the stackedDimInfo.
            if (!stackedDimInfo
                && dimensionInfo.type !== 'ordinal'
                && dimensionInfo.type !== 'time'
            ) {
                stackedDimInfo = dimensionInfo;
            }
        }
    });

    // Add stack dimension, they can be both calculated by coordinate system in `unionExtent`.
    // That put stack logic in List is for using conveniently in echarts extensions, but it
    // might not be a good way.
    if (stackedByDimInfo && stackedDimInfo) {
        // Use a weird name that not duplicated with other names.
        stackResultDimension = '__\0ecstackresult';
        stackedOverDimension = '__\0ecstackedover';

        // Create inverted index to fast query index by value.
        stackedByDimInfo.createInvertedIndices = true;

        var stackedDimCoordDim = stackedDimInfo.coordDim;
        var stackedDimType = stackedDimInfo.type;
        var stackedDimCoordIndex = 0;

        each(dimensionInfoList, function (dimensionInfo) {
            if (dimensionInfo.coordDim === stackedDimCoordDim) {
                stackedDimCoordIndex++;
            }
        });

        dimensionInfoList.push({
            name: stackResultDimension,
            coordDim: stackedDimCoordDim,
            coordDimIndex: stackedDimCoordIndex,
            type: stackedDimType,
            isExtraCoord: true
        });

        stackedDimCoordIndex++;

        dimensionInfoList.push({
            name: stackedOverDimension,
            coordDim: stackedDimCoordDim,
            coordDimIndex: stackedDimCoordIndex,
            type: stackedDimType,
            isExtraCoord: true
        });
    }

    return {
        stackedDimension: stackedDimInfo && stackedDimInfo.name,
        stackedByDimension: stackedByDimInfo && stackedByDimInfo.name,
        stackedOverDimension: stackedOverDimension,
        stackResultDimension: stackResultDimension
    };
}

export function isDimensionStacked(data, stackedDim, stackedByDim) {
    return stackedDim
        && stackedByDim
        && stackedDim === data.getCalculationInfo('stackedDimension')
        && stackedByDim === data.getCalculationInfo('stackedByDimension');
}
