define(function (require) {

    var featureManager = require('./featureManager');
    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var Model = require('../../model/Model');
    var listComponentHelper = require('../helper/listComponent');
    var textContain = require('zrender/contain/text');

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

                // If one feature has mutiple icon. they are orginaized as
                // {
                //     icon: {
                //         foo: '',
                //         bar: ''
                //     },
                //     title: {
                //         foo: '',
                //         bar: ''
                //     }
                // }
                var icons = feature.getIcons ? feature.getIcons() : featureModel.get('icon');
                var titles = featureModel.get('title') || {};
                if (typeof icons === 'string') {
                    var icon = icons;
                    var title = titles;
                    icons = {};
                    titles = {};
                    icons[featureName] = icon;

                    titles[featureName] = title;
                }

                zrUtil.each(icons, function (icon, iconName) {
                    var path = graphic.makePath(
                        icon, {
                            style: normalStyle,
                            hoverStyle: zrUtil.extend({
                                text: titles[iconName],
                                textPosition: 'bottom',
                                textFill: hoverStyle.fill || hoverStyle.stroke || '#000'
                            }, hoverStyle),
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

            // Adjust icon title positions to avoid them out of screen
            group.eachChild(function (icon) {
                var hoverStyle = icon.hoverStyle;
                // May be background element
                if (hoverStyle && hoverStyle.text) {
                    var rect = textContain.getBoundingRect(
                        hoverStyle.text, hoverStyle.font
                    );
                    var offsetX = icon.position[0] + group.position[0];
                    var offsetY = icon.position[1] + group.position[1] + itemSize;

                    var needPutOnTop = false;
                    if (offsetY + rect.height > api.getHeight()) {
                        hoverStyle.textPosition = 'top';
                        needPutOnTop = true;
                    }
                    var topOffset = needPutOnTop ? (-5 - rect.height) : (itemSize + 8);
                    if (offsetX + rect.width /  2 > api.getWidth()) {
                        hoverStyle.textPosition = ['100%', topOffset];
                        hoverStyle.textAlign = 'right';
                    }
                    else if (offsetX - rect.width / 2 < 0) {
                        hoverStyle.textPosition = [0, topOffset];
                        hoverStyle.textAlign = 'left';
                    }
                }
            });
        }
    });
});