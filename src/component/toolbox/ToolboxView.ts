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

import * as zrUtil from 'zrender/src/core/util';
import * as textContain from 'zrender/src/contain/text';
import * as graphic from '../../util/graphic';
import Model from '../../model/Model';
import DataDiffer from '../../data/DataDiffer';
import * as listComponentHelper from '../helper/listComponent';
import ComponentView from '../../view/Component';
import ToolboxModel from './ToolboxModel';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../ExtensionAPI';
import { DisplayState, Dictionary, ECElement, Payload } from '../../util/types';
import {
    ToolboxFeature,
    getFeature,
    ToolboxFeatureModel,
    ToolboxFeatureOption,
    UserDefinedToolboxFeature
} from './featureManager';
import { getUID } from '../../util/component';

type IconPath = ToolboxFeatureModel['iconPaths'][string];

type ExtendedPath = IconPath & {
    __title: string
}

class ToolboxView extends ComponentView {
    static type = 'toolbox' as const

    _features: Dictionary<ToolboxFeature | UserDefinedToolboxFeature>

    _featureNames: string[]

    render(
        toolboxModel: ToolboxModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: Payload & {
            newTitle?: ToolboxFeatureOption['title']
        }
    ) {
        var group = this.group;
        group.removeAll();

        if (!toolboxModel.get('show')) {
            return;
        }

        var itemSize = +toolboxModel.get('itemSize');
        var featureOpts = toolboxModel.get('feature') || {};
        var features = this._features || (this._features = {});

        var featureNames: string[] = [];
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

        function processFeature(newIndex: number, oldIndex?: number) {
            var featureName = featureNames[newIndex];
            var oldName = featureNames[oldIndex];
            var featureOpt = featureOpts[featureName];
            var featureModel = new Model(featureOpt, toolboxModel, toolboxModel.ecModel) as ToolboxFeatureModel;
            var feature: ToolboxFeature | UserDefinedToolboxFeature;

            // FIX#11236, merge feature title from MagicType newOption. TODO: consider seriesIndex ?
            if (payload && payload.newTitle != null) {
                featureOpt.title = payload.newTitle;
            }

            if (featureName && !oldName) { // Create
                if (isUserFeatureName(featureName)) {
                    feature = {
                        onclick: featureModel.option.onclick,
                        featureName: featureName
                    } as UserDefinedToolboxFeature;
                }
                else {
                    var Feature = getFeature(featureName);
                    if (!Feature) {
                        return;
                    }
                    feature = new Feature();
                }
                features[featureName] = feature;
            }
            else {
                feature = features[oldName];
                // If feature does not exsit.
                if (!feature) {
                    return;
                }
            }
            feature.uid = getUID('toolbox-feature');
            feature.model = featureModel;
            feature.ecModel = ecModel;
            feature.api = api;

            if (feature instanceof ToolboxFeature) {
                if (!featureName && oldName) {
                    feature.dispose && feature.dispose(ecModel, api);
                    return;
                }

                if (!featureModel.get('show') || feature.unusable) {
                    feature.remove && feature.remove(ecModel, api);
                    return;
                }
            }
            createIconPaths(featureModel, feature, featureName);

            featureModel.setIconStatus = function (this: ToolboxFeatureModel, iconName: string, status: DisplayState) {
                var option = this.option;
                var iconPaths = this.iconPaths;
                option.iconStatus = option.iconStatus || {};
                option.iconStatus[iconName] = status;
                // FIXME
                iconPaths[iconName] && iconPaths[iconName].trigger(status);
            };

            if (feature instanceof ToolboxFeature) {
                if (feature.render) {
                    feature.render(featureModel, ecModel, api, payload);
                }
            }
        }

        function createIconPaths(
            featureModel: ToolboxFeatureModel,
            feature: ToolboxFeature | UserDefinedToolboxFeature,
            featureName: string
        ) {
            var iconStyleModel = featureModel.getModel('iconStyle');
            var iconStyleEmphasisModel = featureModel.getModel(['emphasis', 'iconStyle']);

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
            var icons = (feature instanceof ToolboxFeature && feature.getIcons)
                ? feature.getIcons() : featureModel.get('icon');
            var titles = featureModel.get('title') || {};
            var iconsMap: Dictionary<string>;
            var titlesMap: Dictionary<string>;
            if (typeof icons === 'string') {
                iconsMap = {};
                iconsMap[featureName] = icons;
            }
            else {
                iconsMap = icons;
            }
            if (typeof titles === 'string') {
                titlesMap = {};
                titlesMap[featureName] = titles as string;
            }
            else {
                titlesMap = titles;
            }
            var iconPaths: ToolboxFeatureModel['iconPaths'] = featureModel.iconPaths = {};
            zrUtil.each(iconsMap, function (iconStr, iconName) {
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
                    text: titlesMap[iconName],
                    textAlign: iconStyleEmphasisModel.get('textAlign'),
                    textBorderRadius: iconStyleEmphasisModel.get('textBorderRadius'),
                    textPadding: iconStyleEmphasisModel.get('textPadding'),
                    textFill: null
                });

                var tooltipModel = toolboxModel.getModel('tooltip');
                if (tooltipModel && tooltipModel.get('show')) {
                    (path as ECElement).tooltip = zrUtil.extend({
                        content: titlesMap[iconName],
                        formatter: tooltipModel.get('formatter', true)
                            || function () {
                                return titlesMap[iconName];
                            },
                        formatterParams: {
                            componentType: 'toolbox',
                            name: iconName,
                            title: titlesMap[iconName],
                            $vars: ['name', 'title']
                        },
                        position: tooltipModel.get('position', true) || 'bottom'
                    }, tooltipModel.option);
                }

                graphic.setHoverStyle(path);

                if (toolboxModel.get('showTitle')) {
                    (path as ExtendedPath).__title = titlesMap[iconName];
                    (path as graphic.Path).on('mouseover', function () {
                            // Should not reuse above hoverStyle, which might be modified.
                            var hoverStyle = iconStyleEmphasisModel.getItemStyle();
                            var defaultTextPosition = toolboxModel.get('orient') === 'vertical'
                                ? (toolboxModel.get('right') == null ? 'right' : 'left')
                                : (toolboxModel.get('bottom') == null ? 'bottom' : 'top');
                            (path as graphic.Path).setStyle({
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
                path.trigger(featureModel.get(['iconStatus', iconName]) || 'normal');

                group.add(path);
                (path as graphic.Path).on('click', zrUtil.bind(
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
        group.eachChild(function (icon: IconPath) {
            var titleText = (icon as ExtendedPath).__title;
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
    }

    updateView(
        toolboxModel: ToolboxModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: unknown
    ) {
        zrUtil.each(this._features, function (feature) {
            feature instanceof ToolboxFeature
                && feature.updateView && feature.updateView(feature.model, ecModel, api, payload);
        });
    }

    // updateLayout(toolboxModel, ecModel, api, payload) {
    //     zrUtil.each(this._features, function (feature) {
    //         feature.updateLayout && feature.updateLayout(feature.model, ecModel, api, payload);
    //     });
    // },

    remove(ecModel: GlobalModel, api: ExtensionAPI) {
        zrUtil.each(this._features, function (feature) {
            feature instanceof ToolboxFeature
                && feature.remove && feature.remove(ecModel, api);
        });
        this.group.removeAll();
    }

    dispose(ecModel: GlobalModel, api: ExtensionAPI) {
        zrUtil.each(this._features, function (feature) {
            feature instanceof ToolboxFeature
                && feature.dispose && feature.dispose(ecModel, api);
        });
    }
}

ComponentView.registerClass(ToolboxView);


function isUserFeatureName(featureName: string): boolean {
    return featureName.indexOf('my') === 0;
}
