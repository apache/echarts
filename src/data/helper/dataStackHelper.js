import {each, isString} from 'zrender/src/core/util';

/**
 * Note that it is too complicated to support 3d stack by value
 * (have to create two-dimension inverted index), so in 3d case
 * we just support that stacked by index.
 *
 * @param {module:echarts/model/Series} seriesModel
 * @param {Array.<string|Object>} dimensionInfoList The same as the input of <module:echarts/data/List>.
 *        The input dimensionInfoList will be modified.
 * @param {Object} [opt]
 * @param {boolean} [opt.stackedCoordDimension=''] Specify a coord dimension if needed.
 * @param {boolean} [opt.byIndex=false]
 * @return {Object} calculationInfo
 * {
 *     stackedDimension: string
 *     stackedByDimension: string
 *     isStackedByIndex: boolean
 *     stackedOverDimension: string
 *     stackResultDimension: string
 * }
 */
export function enableDataStack(seriesModel, dimensionInfoList, opt) {
    opt = opt || {};
    var byIndex = opt.byIndex;
    var stackedCoordDimension = opt.stackedCoordDimension;

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
            if (!byIndex && !stackedByDimInfo && dimensionInfo.ordinalMeta) {
                stackedByDimInfo = dimensionInfo;
            }
            // Find the first stackable dimension as the stackedDimInfo.
            if (!stackedDimInfo
                && dimensionInfo.type !== 'ordinal'
                && dimensionInfo.type !== 'time'
                && (!stackedCoordDimension || stackedCoordDimension === dimensionInfo.coordDim)
            ) {
                stackedDimInfo = dimensionInfo;
            }
        }
    });

    // Add stack dimension, they can be both calculated by coordinate system in `unionExtent`.
    // That put stack logic in List is for using conveniently in echarts extensions, but it
    // might not be a good way.
    if (stackedDimInfo && (byIndex || stackedByDimInfo)) {
        // Use a weird name that not duplicated with other names.
        stackResultDimension = '__\0ecstackresult';
        stackedOverDimension = '__\0ecstackedover';

        // Create inverted index to fast query index by value.
        if (stackedByDimInfo) {
            stackedByDimInfo.createInvertedIndices = true;
        }

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
            isExtraCoord: true,
            isCalculationCoord: true
        });

        stackedDimCoordIndex++;

        dimensionInfoList.push({
            name: stackedOverDimension,
            // This dimension contains stack base (generally, 0), so do not set it as
            // `stackedDimCoordDim` to avoid extent calculation, consider log scale.
            coordDim: stackedOverDimension,
            coordDimIndex: stackedDimCoordIndex,
            type: stackedDimType,
            isExtraCoord: true,
            isCalculationCoord: true
        });
    }

    return {
        stackedDimension: stackedDimInfo && stackedDimInfo.name,
        stackedByDimension: stackedByDimInfo && stackedByDimInfo.name,
        isStackedByIndex: byIndex,
        stackedOverDimension: stackedOverDimension,
        stackResultDimension: stackResultDimension
    };
}

/**
 * @param {module:echarts/data/List} data
 * @param {string} stackedDim
 * @param {string} [stackedByDim] If not input this parameter, check whether
 *                                stacked by index.
 */
export function isDimensionStacked(data, stackedDim, stackedByDim) {
    return stackedDim
        && stackedDim === data.getCalculationInfo('stackedDimension')
        && (
            stackedByDim != null
                ? stackedByDim === data.getCalculationInfo('stackedByDimension')
                : data.getCalculationInfo('isStackedByIndex')
        );
}
