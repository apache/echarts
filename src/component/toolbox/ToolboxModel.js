import * as echarts from '../../echarts';
import * as zrUtil from 'zrender/src/core/util';
import * as featureManager from './featureManager';

var ToolboxModel = echarts.extendComponentModel({

    type: 'toolbox',

    layoutMode: {
        type: 'box',
        ignoreSize: true
    },

    mergeDefaultAndTheme: function (option) {
        ToolboxModel.superApply(this, 'mergeDefaultAndTheme', arguments);

        zrUtil.each(this.option.feature, function (featureOpt, featureName) {
            var Feature = featureManager.get(featureName);
            Feature && zrUtil.merge(featureOpt, Feature.defaultOption);
        });
    },

    defaultOption: {

        show: true,

        z: 6,

        zlevel: 0,

        orient: 'horizontal',

        left: 'right',

        top: 'top',

        // right
        // bottom

        backgroundColor: 'transparent',

        borderColor: '#ccc',

        borderRadius: 0,

        borderWidth: 0,

        padding: 5,

        itemSize: 15,

        itemGap: 8,

        showTitle: true,

        iconStyle: {
            normal: {
                borderColor: '#666',
                color: 'none'
            },
            emphasis: {
                borderColor: '#3E98C5'
            }
        }
        // textStyle: {},

        // feature
    }
});

export default ToolboxModel;