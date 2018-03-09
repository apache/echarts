/**
 * This module is imported by echarts directly.
 *
 * Notice:
 * Always keep this file exists for backward compatibility.
 * Because before 4.1.0, dataset is an optional component,
 * some users may import this module manually.
 */

import ComponentModel from '../model/Component';
import ComponentView from '../view/Component';
import {detectSourceFormat} from '../data/helper/sourceHelper';
import {SERIES_LAYOUT_BY_COLUMN} from '../data/helper/sourceType';

ComponentModel.extend({

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

ComponentView.extend({

    type: 'dataset'

});
