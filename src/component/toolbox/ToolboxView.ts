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
import { enterEmphasis, leaveEmphasis } from '../../util/states';
import Model from '../../model/Model';
import DataDiffer from '../../data/DataDiffer';
import * as listComponentHelper from '../helper/listComponent';
import ComponentView from '../../view/Component';
import ToolboxModel from './ToolboxModel';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import { DisplayState, Dictionary, ECElement, Payload } from '../../util/types';
import {
    ToolboxFeature,
    getFeature,
    ToolboxFeatureModel,
    ToolboxFeatureOption,
    UserDefinedToolboxFeature
} from './featureManager';
import { getUID } from '../../util/component';
import Displayable from 'zrender/src/graphic/Displayable';
import ZRText from 'zrender/src/graphic/Text';

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
        const group = this.group;
        group.removeAll();

        if (!toolboxModel.get('show')) {
            return;
        }

        const itemSize = +toolboxModel.get('itemSize');
        const featureOpts = toolboxModel.get('feature') || {};
        const features = this._features || (this._features = {});

        const featureNames: string[] = [];
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
            const featureName = featureNames[newIndex];
            const oldName = featureNames[oldIndex];
            const featureOpt = featureOpts[featureName];
            const featureModel = new Model(featureOpt, toolboxModel, toolboxModel.ecModel) as ToolboxFeatureModel;
            let feature: ToolboxFeature | UserDefinedToolboxFeature;

            // FIX#11236, merge feature title from MagicType newOption. TODO: consider seriesIndex ?
            if (payload && payload.newTitle != null && payload.featureName === featureName) {
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
                    const Feature = getFeature(featureName);
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
                const option = this.option;
                const iconPaths = this.iconPaths;
                option.iconStatus = option.iconStatus || {};
                option.iconStatus[iconName] = status;
                if (iconPaths[iconName]) {
                    (status === 'emphasis' ? enterEmphasis : leaveEmphasis)(iconPaths[iconName]);
                }
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
            const iconStyleModel = featureModel.getModel('iconStyle');
            const iconStyleEmphasisModel = featureModel.getModel(['emphasis', 'iconStyle']);

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
            const icons = (feature instanceof ToolboxFeature && feature.getIcons)
                ? feature.getIcons() : featureModel.get('icon');
            const titles = featureModel.get('title') || {};
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
            const iconPaths: ToolboxFeatureModel['iconPaths'] = featureModel.iconPaths = {};
            zrUtil.each(iconsMap, function (iconStr, iconName) {
                const path = graphic.createIcon(
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
                const textContent = new ZRText({
                    style: {
                        text: titlesMap[iconName],
                        align: iconStyleEmphasisModel.get('textAlign'),
                        borderRadius: iconStyleEmphasisModel.get('textBorderRadius'),
                        padding: iconStyleEmphasisModel.get('textPadding'),
                        fill: null
                    },
                    ignore: true
                });
                path.setTextContent(textContent);

                const tooltipModel = toolboxModel.getModel('tooltip');
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

                // graphic.enableHoverEmphasis(path);

                (path as ExtendedPath).__title = titlesMap[iconName];
                (path as graphic.Path).on('mouseover', function () {
                    // Should not reuse above hoverStyle, which might be modified.
                    const hoverStyle = iconStyleEmphasisModel.getItemStyle();
                    const defaultTextPosition = toolboxModel.get('orient') === 'vertical'
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
                    textContent.ignore = !toolboxModel.get('showTitle');

                    // Use enterEmphasis and leaveEmphasis provide by ec.
                    // There are flags managed by the echarts.
                    enterEmphasis(this);
                })
                .on('mouseout', function () {
                    if (featureModel.get(['iconStatus', iconName]) !== 'emphasis') {
                        leaveEmphasis(this);
                    }
                    textContent.hide();
                });
                (featureModel.get(['iconStatus', iconName]) === 'emphasis' ? enterEmphasis : leaveEmphasis)(path);

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
            const emphasisState = icon.ensureState('emphasis');
            const emphasisTextConfig = emphasisState.textConfig || (emphasisState.textConfig = {});
            const textContent = icon.getTextContent();
            const emphasisTextState = textContent && textContent.states.emphasis;
            // May be background element
            if (emphasisTextState && !zrUtil.isFunction(emphasisTextState) && titleText) {
                const emphasisTextStyle = emphasisTextState.style || (emphasisTextState.style = {});
                const rect = textContain.getBoundingRect(
                    titleText, ZRText.makeFont(emphasisTextStyle)
                );
                const offsetX = icon.x + group.x;
                const offsetY = icon.y + group.y + itemSize;

                let needPutOnTop = false;
                if (offsetY + rect.height > api.getHeight()) {
                    emphasisTextConfig.position = 'top';
                    needPutOnTop = true;
                }
                const topOffset = needPutOnTop ? (-5 - rect.height) : (itemSize + 8);
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


function isUserFeatureName(featureName: string): boolean {
    return featureName.indexOf('my') === 0;
}
export default ToolboxView;