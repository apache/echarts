
import createDimensions from '../../data/helper/createDimensions';
import List from '../../data/List';
import {extend, isArray} from 'zrender/src/core/util';

/**
 * [Usage]:
 * (1)
 * createListSimply(seriesModel, ['value']);
 * (2)
 * createListSimply(seriesModel, {
 *     coordDimensions: ['value'],
 *     dimensionsCount: 5
 * });
 *
 * @param {module:echarts/model/Series} seriesModel
 * @param {Object|Array.<string|Object>} opt opt or coordDimensions
 *        The options in opt, see `echarts/data/helper/createDimensions`
 * @param {Array.<string>} [nameList]
 * @return {module:echarts/data/List}
 */
export default function (seriesModel, opt, nameList) {
    opt = isArray(opt) && {coordDimensions: opt} || extend({}, opt);

    var source = seriesModel.getSource();

    var dimensionsInfo = createDimensions(source, opt);

    var list = new List(dimensionsInfo, seriesModel);
    list.initData(source, nameList);

    return list;
}
