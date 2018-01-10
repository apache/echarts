import * as echarts from '../../echarts';
import {
    SERIES_LAYOUT_BY_COLUMN,
    detectSourceFormat
} from '../../data/helper/sourceHelper';

var DatasetModel = echarts.extendComponentModel({

    type: 'dataset',

    /**
     * @protected
     */
    defaultOption: {

        // 'row', 'column'
        seriesLayoutBy: SERIES_LAYOUT_BY_COLUMN,

        // null/'auto': auto detect header, see "module:echarts/data/helper/sourceHelper"
        sourceHeader: null,

        dimensions: null,

        source: null
    },

    optionUpdated: function () {
        detectSourceFormat(this);
    }

});

export default DatasetModel;
