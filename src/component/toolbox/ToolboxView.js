define(function (require) {

    var featureManager = require('./featureManager');
    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var Model = require('../../model/Model');
    var DataDiffer = require('../../data/DataDiffer');
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
            var featureOpts = toolboxModel.get('feature') || {};
            var features = this._features || (this._features = {});

            var featureNames = [];
            zrUtil.each(featureOpts, function (opt, name) {
                featureNames.push(name);
            });

            (new DataDiffer(this._featureNames || [], featureNames))
                .add(process)
                .update(process)
                .remove(zrUtil.curry(process, null))
                .execute();

            // Keep for diff.
            this._featureNames = featureNames;

            function process(newIndex, oldIndex) {
                var featureName = featureNames[newIndex];
                var oldName = featureNames[oldIndex];
                var featureOpt = featureOpts[featureName];
                var featureModel = new Model(featureOpt, toolboxModel, toolboxModel.ecModel);
                var feature;

                if (featureName && !oldName) { // Create
                    var Feature = featureManager.get(featureName);
                    if (!Feature) {
                        return;
                    }
                    features[featureName] = feature = new Feature(featureModel);
                }
                else {
                    feature = features[oldName];
                    // If not exsits feature
                    if (!feature) {
                        return;
                    }
                    feature.model = featureModel;
                }

                if (!featureName && oldName) {
                    feature.dispose && feature.dispose(ecModel, api);
                    return;
                }

                if (!featureModel.get('show')) {
                    feature.remove && feature.remove(ecModel, api);
                    return;
                }

                createIconPaths(featureModel, feature, featureName);

                featureModel.setIconStatus = function (iconName, status) {
                    var option = this.option;
                    var iconPaths = this.iconPaths;
                    option.iconStatus = option.iconStatus || {};
                    option.iconStatus[iconName] = status;
                    // FIXME
                    iconPaths[iconName] && iconPaths[iconName].trigger(status);
                };

                if (feature.render) {
                    feature.render(featureModel, ecModel, api);
                }
            }

            function createIconPaths(featureModel, feature, featureName) {
                var iconStyleModel = featureModel.getModel('iconStyle');

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

                var iconPaths = featureModel.iconPaths = {};
                zrUtil.each(icons, function (icon, iconName) {
                    var normalStyle = iconStyleModel.getModel('normal').getItemStyle();
                    var hoverStyle = iconStyleModel.getModel('emphasis').getItemStyle();
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

                    if (toolboxModel.get('showTitle')) {
                        path.__title = titles[iconName];
                        path.on('mouseover', function () {
                                path.setStyle({
                                    text: titles[iconName],
                                    textPosition: hoverStyle.textPosition || 'bottom',
                                    textFill: hoverStyle.fill || hoverStyle.stroke || '#000',
                                    textAlign: hoverStyle.textAlign || 'center'
                                });
                            })
                            .on('mouseout', function () {
                                path.setStyle({
                                    textFill: null
                                });
                            });
                    }
                    path.trigger(featureModel.get('iconStatus.' + iconName) || 'normal');

                    group.add(path);
                    path.on('click', zrUtil.bind(
                        feature.onclick, feature, ecModel, api, iconName
                    ));

                    iconPaths[iconName] = path;
                });
            }

            listComponentHelper.layout(group, toolboxModel, api);
            // Render background after group is layout
            // FIXME
            listComponentHelper.addBackground(group, toolboxModel);

            // Adjust icon title positions to avoid them out of screen
            group.eachChild(function (icon) {
                var titleText = icon.__title;
                var hoverStyle = icon.hoverStyle;
                // May be background element
                if (hoverStyle && titleText) {
                    var rect = textContain.getBoundingRect(
                        titleText, hoverStyle.font
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
        },

        remove: function (ecModel, api) {
            zrUtil.each(this._features, function (feature) {
                feature.remove && feature.remove(ecModel, api);
            });
            this.group.removeAll();
        },

        dispose: function (ecModel, api) {
            zrUtil.each(this._features, function (feature) {
                feature.dispose && feature.dispose(ecModel, api);
            });
        }
    });
});