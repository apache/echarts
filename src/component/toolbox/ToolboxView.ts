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
import { RichText } from 'zrender/src/export';
import Displayable from 'zrender/src/graphic/Displayable';

type IconPath = ToolboxFeatureModel['iconPaths'][string];

type ExtendedPath = IconPath & {
    __title: string
};

class ToolboxView extends ComponentView {
    static type = 'toolbox' as const;

    _features: Dictionary<ToolboxFeature | UserDefinedToolboxFeature>;

    _featureNames: string[];

    render(
        toolboxModel: ToolboxModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: Payload & {
            newTitle?: ToolboxFeatureOption['title']
        }
    ) {
        let group = this.group;
        group.removeAll();

        if (!toolboxModel.get('show')) {
            return;
        }

        let itemSize = +toolboxModel.get('itemSize');
        let featureOpts = toolboxModel.get('feature') || {};
        let features = this._features || (this._features = {});

        let featureNames: string[] = [];
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
            let featureName = featureNames[newIndex];
            let oldName = featureNames[oldIndex];
            let featureOpt = featureOpts[featureName];
            let featureModel = new Model(featureOpt, toolboxModel, toolboxModel.ecModel) as ToolboxFeatureModel;
            let feature: ToolboxFeature | UserDefinedToolboxFeature;

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
                    let Feature = getFeature(featureName);
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
                let option = this.option;
                let iconPaths = this.iconPaths;
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
            let iconStyleModel = featureModel.getModel('iconStyle');
            let iconStyleEmphasisModel = featureModel.getModel(['emphasis', 'iconStyle']);

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
            let icons = (feature instanceof ToolboxFeature && feature.getIcons)
                ? feature.getIcons() : featureModel.get('icon');
            let titles = featureModel.get('title') || {};
            let iconsMap: Dictionary<string>;
            let titlesMap: Dictionary<string>;
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
            let iconPaths: ToolboxFeatureModel['iconPaths'] = featureModel.iconPaths = {};
            zrUtil.each(iconsMap, function (iconStr, iconName) {
                let path = graphic.createIcon(
                    iconStr,
                    {},
                    {
                        x: -itemSize / 2,
                        y: -itemSize / 2,
                        width: itemSize,
                        height: itemSize
                    }
                ) as Displayable;  // TODO handling image
                path.setStyle(iconStyleModel.getItemStyle());

                const pathEmphasisState = path.ensureState('emphasis');
                pathEmphasisState.style = iconStyleEmphasisModel.getItemStyle();

                // Text position calculation
                const textContent = new RichText({
                    style: {
                        text: titlesMap[iconName],
                        align: iconStyleEmphasisModel.get('textAlign'),
                        borderRadius: iconStyleEmphasisModel.get('textBorderRadius'),
                        padding: iconStyleEmphasisModel.get('textPadding'),
                        fill: null
                    }
                });
                path.setTextContent(textContent);

                let tooltipModel = toolboxModel.getModel('tooltip');
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

                graphic.enableHoverEmphasis(path);

                if (toolboxModel.get('showTitle')) {
                    (path as ExtendedPath).__title = titlesMap[iconName];
                    (path as graphic.Path).on('mouseover', function () {
                        // Should not reuse above hoverStyle, which might be modified.
                        let hoverStyle = iconStyleEmphasisModel.getItemStyle();
                        let defaultTextPosition = toolboxModel.get('orient') === 'vertical'
                            ? (toolboxModel.get('right') == null ? 'right' as const : 'left' as const)
                            : (toolboxModel.get('bottom') == null ? 'bottom' as const : 'top' as const);
                        textContent.setStyle({
                            fill: (iconStyleEmphasisModel.get('textFill')
                                || hoverStyle.fill || hoverStyle.stroke || '#000') as string,
                            backgroundColor: iconStyleEmphasisModel.get('textBackgroundColor')
                        });
                        path.setTextConfig({
                            position: iconStyleEmphasisModel.get('textPosition') || defaultTextPosition
                        });
                        textContent.ignore = false;
                    })
                    .on('mouseout', function () {
                        textContent.ignore = true;
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
            const titleText = (icon as ExtendedPath).__title;
            // const hoverStyle = icon.hoverStyle;

            // TODO simplify code?
            const emphasisState = icon.states.emphasis;
            const emphasisTextConfig = emphasisState.textConfig || (emphasisState.textConfig = {});
            const textContent = icon.getTextContent();
            const emphasisTextState = textContent && textContent.states.emphasis;
            // May be background element
            if (emphasisTextState && titleText) {
                const emphasisTextStyle = emphasisTextState.style || (emphasisTextState.style = {});
                let rect = textContain.getBoundingRect(
                    titleText, RichText.makeFont(emphasisTextStyle)
                );
                let offsetX = icon.position[0] + group.position[0];
                let offsetY = icon.position[1] + group.position[1] + itemSize;

                let needPutOnTop = false;
                if (offsetY + rect.height > api.getHeight()) {
                    emphasisTextConfig.position = 'top';
                    needPutOnTop = true;
                }
                let topOffset = needPutOnTop ? (-5 - rect.height) : (itemSize + 8);
                if (offsetX + rect.width / 2 > api.getWidth()) {
                    emphasisTextConfig.position = ['100%', topOffset];
                    emphasisTextStyle.align = 'right';
                }
                else if (offsetX - rect.width / 2 < 0) {
                    emphasisTextConfig.position = [0, topOffset];
                    emphasisTextStyle.align = 'left';
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
