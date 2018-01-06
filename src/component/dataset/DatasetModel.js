import * as echarts from '../../echarts';
import { detectSourceFormat } from '../../data/helper/sourceHelper';

var DatasetModel = echarts.extendComponentModel({

    type: 'dataset',

    /**
     * @readOnly
     */
    parsedData: null,

    /**
     * @protected
     */
    defaultOption: {

        // 'row', 'column'
        seriesLayoutBy: 'column',

        // see "module:echarts/data/helper/sourceHelper#detectSourceFormat"
        sourceFormat: 'unknown',

        header: true,

        dimensions: null,

        source: null
    },

    /**
     * @override
     */
    optionUpdated: function () {
        var option = this.option;
        var sourceFormat = option.sourceFormat;
        if (sourceFormat == null || sourceFormat === 'unknown') {
            option.sourceFormat = detectSourceFormat(option.source);
        }
    }

});

export default DatasetModel;
