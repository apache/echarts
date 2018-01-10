import * as zrUtil from 'zrender/src/core/util';
import Axis from '../Axis';

function IndicatorAxis(dim, scale, radiusExtent) {
    Axis.call(this, dim, scale, radiusExtent);

    /**
     * Axis type
     *  - 'category'
     *  - 'value'
     *  - 'time'
     *  - 'log'
     * @type {string}
     */
    this.type = 'value';

    this.angle = 0;

    /**
     * Indicator name
     * @type {string}
     */
    this.name = '';
    /**
     * @type {module:echarts/model/Model}
     */
    this.model;
}

zrUtil.inherits(IndicatorAxis, Axis);

export default IndicatorAxis;