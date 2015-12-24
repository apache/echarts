define(function (require) {

    var featureManager = require('./featureManager');
    var zrUtil = require('zrender/core/util');

    require('../../echarts').extendComponentModel({

        type: 'toolbox',

        mergeDefaultAndTheme: function (option) {
            this.$superApply('mergeDefaultAndTheme', arguments);

            zrUtil.each(this.option.feature, function (featureOpt, featureName) {
                var Feature = featureManager.get(featureName);
                zrUtil.merge(featureOpt, Feature.defaultOption);
            });
        },

        defaultOption: {

            show: true,

            z: 6,

            zlevel: 0,

            orient: 'horizontal',

            x: 'right',

            y: 'top',

            // x2
            // y2

            backgroundColor: 'transparent',

            borderColor: '#ccc',

            borderWidth: 0,

            padding: 10,

            itemGap: 10,

            itemSize: 15,

            showTitle: true

            // textStyle: {},

            // feature
        }
    });
})