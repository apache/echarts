/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import * as echarts from '../../echarts';
import * as zrUtil from 'zrender/src/core/util';
import * as textContain from 'zrender/src/contain/text';
import * as featureManager from './featureManager';
import * as graphic from '../../util/graphic';
import Model from '../../model/Model';
import DataDiffer from '../../data/DataDiffer';
import * as listComponentHelper from '../helper/listComponent';

export default echarts.extendComponentView({

    type: 'toolbox',

    render: function (toolboxModel, ecModel, api, payload) {
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
            .add(processFeature)
            .update(processFeature)
            .remove(zrUtil.curry(processFeature, null))
            .execute();

        // Keep for diff.
        this._featureNames = featureNames;

        function processFeature(newIndex, oldIndex) {
            var featureName = featureNames[newIndex];
            var oldName = featureNames[oldIndex];
            var featureOpt = featureOpts[featureName];
            var featureModel = new Model(featureOpt, toolboxModel, toolboxModel.ecModel);
            var feature;

            if (featureName && !oldName) { // Create
                if (isUserFeatureName(featureName)) {
                    feature = {
                        model: featureModel,
                        onclick: featureModel.option.onclick,
                        featureName: featureName
                    };
                }
                else {
                    var Feature = featureManager.get(featureName);
                    if (!Feature) {
                        return;
                    }
                    feature = new Feature(featureModel, ecModel, api);
                }
                features[featureName] = feature;
            }
            else {
                feature = features[oldName];
                // If feature does not exsit.
                if (!feature) {
                    return;
                }
                feature.model = featureModel;
                feature.ecModel = ecModel;
                feature.api = api;
            }

            if (!featureName && oldName) {
                feature.dispose && feature.dispose(ecModel, api);
                return;
            }

            if (!featureModel.get('show') || feature.unusable) {
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
                feature.render(featureModel, ecModel, api, payload);
            }
        }

        function createIconPaths(featureModel, feature, featureName) {
            var iconStyleModel = featureModel.getModel('iconStyle');
            var iconStyleEmphasisModel = featureModel.getModel('emphasis.iconStyle');

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
            zrUtil.each(icons, function (iconStr, iconName) {
                var path = graphic.createIcon(
                    iconStr,
                    {},
                    {
                        x: -itemSize / 2,
                        y: -itemSize / 2,
                        width: itemSize,
                        height: itemSize
                    }
                );
                path.setStyle(iconStyleModel.getItemStyle());
                path.hoverStyle = iconStyleEmphasisModel.getItemStyle();

                // Text position calculation
                path.setStyle({
                    text: titles[iconName],
                    textAlign: iconStyleEmphasisModel.get('textAlign'),
                    textBorderRadius: iconStyleEmphasisModel.get('textBorderRadius'),
                    textPadding: iconStyleEmphasisModel.get('textPadding'),
                    textFill: null
                });

                var tooltipModel = toolboxModel.getModel('tooltip');
                if (tooltipModel && tooltipModel.get('show')) {
                    path.attr('tooltip', zrUtil.extend({
                        content: titles[iconName],
                        formatter: tooltipModel.get('formatter', true)
                            || function () {
                                return titles[iconName];
                            },
                        formatterParams: {
                            componentType: 'toolbox',
                            name: iconName,
                            title: titles[iconName],
                            $vars: ['name', 'title']
                        },
                        position: tooltipModel.get('position', true) || 'bottom'
                    }, tooltipModel.option));
                }

                graphic.setHoverStyle(path);

                if (toolboxModel.get('showTitle')) {
                    path.__title = titles[iconName];
                    path.on('mouseover', function () {
                            // Should not reuse above hoverStyle, which might be modified.
                            var hoverStyle = iconStyleEmphasisModel.getItemStyle();
                            var defaultTextPosition = toolboxModel.get('orient') === 'vertical'
                                ? (toolboxModel.get('right') == null ? 'right' : 'left')
                                : (toolboxModel.get('bottom') == null ? 'bottom' : 'top');
                            path.setStyle({
                                textFill: iconStyleEmphasisModel.get('textFill')
                                    || hoverStyle.fill || hoverStyle.stroke || '#000',
                                textBackgroundColor: iconStyleEmphasisModel.get('textBackgroundColor'),
                                textPosition: iconStyleEmphasisModel.get('textPosition') || defaultTextPosition
                            });
                        })
                        .on('mouseout', function () {
                            path.setStyle({
                                textFill: null,
                                textBackgroundColor: null
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
        group.add(listComponentHelper.makeBackground(group.getBoundingRect(), toolboxModel));

        // Adjust icon title positions to avoid them out of screen
        group.eachChild(function (icon) {
            var titleText = icon.__title;
            var hoverStyle = icon.hoverStyle;
            // May be background element
            if (hoverStyle && titleText) {
                var rect = textContain.getBoundingRect(
                    titleText, textContain.makeFont(hoverStyle)
                );
                var offsetX = icon.position[0] + group.position[0];
                var offsetY = icon.position[1] + group.position[1] + itemSize;

                var needPutOnTop = false;
                if (offsetY + rect.height > api.getHeight()) {
                    hoverStyle.textPosition = 'top';
                    needPutOnTop = true;
                }
                var topOffset = needPutOnTop ? (-5 - rect.height) : (itemSize + 8);
                if (offsetX + rect.width / 2 > api.getWidth()) {
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

    updateView: function (toolboxModel, ecModel, api, payload) {
        zrUtil.each(this._features, function (feature) {
            feature.updateView && feature.updateView(feature.model, ecModel, api, payload);
        });
    },

    // updateLayout: function (toolboxModel, ecModel, api, payload) {
    //     zrUtil.each(this._features, function (feature) {
    //         feature.updateLayout && feature.updateLayout(feature.model, ecModel, api, payload);
    //     });
    // },

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

function isUserFeatureName(featureName) {
    return featureName.indexOf('my') === 0;
}
