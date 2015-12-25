define(function (require) {

    var featureManager = require('./featureManager');
    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var Model = require('../../model/Model');
    var listComponentHelper = require('../helper/listComponent');

    return require('../../echarts').extendComponentView({

        type: 'toolbox',

        render: function (toolboxModel, ecModel, api) {
            var group = this.group;
            group.removeAll();

            if (!toolboxModel.get('show')) {
                return;
            }

            var itemSize = +toolboxModel.get('itemSize');

            zrUtil.each(toolboxModel.get('feature'), function (featureOpt, featureName) {
                var Feature = featureManager.get(featureName);
                if (!Feature) {
                    return;
                }

                var featureModel = new Model(featureOpt, toolboxModel, toolboxModel.ecModel);
                var feature = new Feature(featureModel);
                if (!featureModel.get('show')) {
                    return;
                }

                var iconStyleModel = featureModel.getModel('iconStyle');
                var normalStyle = iconStyleModel.getModel('normal').getItemStyle();
                var hoverStyle = iconStyleModel.getModel('emphasis').getItemStyle();

                var icons = feature.getIcons ? feature.getIcons() : featureModel.get('icon');
                if (typeof icons === 'string') {
                    var icon = icons;
                    icons = {};
                    icons[featureName] = icon;
                }

                zrUtil.each(icons, function (icon, iconName) {
                    var path = graphic.makePath(
                        icon, {
                            style: normalStyle,
                            hoverStyle: hoverStyle,
                            rectHover: true
                        }, {
                            x: -itemSize / 2,
                            y: -itemSize / 2,
                            width: itemSize,
                            height: itemSize
                        }, 'center'
                    );

                    graphic.setHoverStyle(path);

                    group.add(path);
                    path.on('click', zrUtil.bind(
                        feature.onclick, feature, ecModel, api, iconName
                    ));
                });
            });

            listComponentHelper.layout(group, toolboxModel, api);
            // Render background after group is layout
            // FIXME
            listComponentHelper.addBackground(group, toolboxModel);
        }
    });
});