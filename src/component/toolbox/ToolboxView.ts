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
import { DisplayState, Dictionary, Payload, NullUndefined } from '../../util/types';
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
import { getFont } from '../../label/labelStyle';
import { box, createBoxLayoutReference, getLayoutRect, positionElement } from '../../util/layout';
import tokens from '../../visual/tokens';
import { bind, createHashMap, curry, each, filter, HashMap, isFunction, isString } from 'zrender/src/core/util';

type IconPath = ToolboxFeatureModel['iconPaths'][string];
type FeatureName = string;

type ExtendedPath = IconPath & {
    __title: string
};

class ToolboxView extends ComponentView {
    static type = 'toolbox' as const;

    /**
     * Current enabled features, including only features having `show: true`.
     */
    _features: HashMap<ToolboxFeature | UserDefinedToolboxFeature | NullUndefined, FeatureName>;

    /**
     * Current enabled feature names, including only features having `show: true`.
     */
    _featureNames: FeatureName[];

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
        const isVertical = toolboxModel.get('orient') === 'vertical';
        const featureOpts = toolboxModel.get('feature') || {};
        const features = this._features || (this._features = createHashMap());

        const newFeatureNames: FeatureName[] = []; // Includes both `show: true/false`.
        each(featureOpts, function (opt, name) {
            newFeatureNames.push(name);
        });

        // Diff by feature name.
        (new DataDiffer(this._featureNames || [], newFeatureNames))
            .add(processFeature)
            .update(processFeature)
            .remove(curry(processFeature, null))
            .execute();

        // Keep for diff.
        this._featureNames = filter(newFeatureNames, function (name) {
            return features.hasKey(name);
        });

        function processFeature(newIndex: number | NullUndefined, oldIndex?: number | NullUndefined) {
            const isDiffAdd = newIndex != null && oldIndex == null;
            const isDiffUpdate = newIndex != null && oldIndex != null;
            const isDiffRemove = newIndex == null;

            const featureName = (isDiffAdd || isDiffUpdate)
                ? newFeatureNames[newIndex]
                : newFeatureNames[oldIndex];
            const featureOpt = featureOpts[featureName];
            const featureModel = (isDiffAdd || isDiffUpdate)
                ? new Model(featureOpt, toolboxModel, ecModel) as ToolboxFeatureModel
                : null;
            // `.get('show')` Also considered UserDefinedToolboxFeature
            const isFeatureShow = featureModel && featureModel.get('show');

            let feature: ToolboxFeature | UserDefinedToolboxFeature;

            if (isDiffAdd) { // DIFF_ADD
                if (!isFeatureShow) {
                    return;
                }
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
                features.set(featureName, feature);
            }
            else { // DIFF_UPDATE or DIFF_REMOVE
                feature = features.get(featureName);
            }

            if (isDiffRemove || !isFeatureShow) {
                if (isTooltipFeature(feature) && feature.dispose) {
                    feature.dispose(ecModel, api);
                }
                features.removeKey(featureName);
                return;
            }

            // FIX#11236, merge feature title from MagicType newOption. TODO: consider seriesIndex ?
            if (payload && payload.newTitle != null && payload.featureName === featureName) {
                // FIXME: ec option should not be modified here.
                featureOpt.title = payload.newTitle;
            }

            if (isDiffAdd) {
                feature.uid = getUID('toolbox-feature');
            }
            feature.model = featureModel;
            feature.ecModel = ecModel;
            feature.api = api;

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

            if (isTooltipFeature(feature) && feature.render) {
                feature.render(featureModel, ecModel, api, payload);
            }
        }

        function createIconPaths(
            featureModel: ToolboxFeatureModel,
            feature: ToolboxFeature | UserDefinedToolboxFeature,
            featureName: string
        ) {
            const iconStyleModel = featureModel.getModel('iconStyle');
            const iconStyleEmphasisModel = featureModel.getModel(['emphasis', 'iconStyle']);

            // If one feature has multiple icons, they are organized as
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
            if (isString(icons)) {
                iconsMap = {};
                iconsMap[featureName] = icons;
            }
            else {
                iconsMap = icons;
            }
            if (isString(titles)) {
                titlesMap = {};
                titlesMap[featureName] = titles as string;
            }
            else {
                titlesMap = titles;
            }
            const iconPaths: ToolboxFeatureModel['iconPaths'] = featureModel.iconPaths = {};
            each(iconsMap, function (iconStr, iconName) {
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
                // TODO: extract `textStyle` from `iconStyle` and use `createTextStyle`
                const textContent = new ZRText({
                    style: {
                        text: titlesMap[iconName],
                        align: iconStyleEmphasisModel.get('textAlign'),
                        borderRadius: iconStyleEmphasisModel.get('textBorderRadius'),
                        padding: iconStyleEmphasisModel.get('textPadding'),
                        fill: null,
                        font: getFont({
                            fontStyle: iconStyleEmphasisModel.get('textFontStyle'),
                            fontFamily: iconStyleEmphasisModel.get('textFontFamily'),
                            fontSize: iconStyleEmphasisModel.get('textFontSize'),
                            fontWeight: iconStyleEmphasisModel.get('textFontWeight')
                        }, ecModel)
                    },
                    ignore: true
                });
                path.setTextContent(textContent);

                graphic.setTooltipConfig({
                    el: path,
                    componentModel: toolboxModel,
                    itemName: iconName,
                    formatterParamsExtra: {
                        title: titlesMap[iconName]
                    }
                });

                (path as ExtendedPath).__title = titlesMap[iconName];
                (path as graphic.Path).on('mouseover', function () {
                    // Should not reuse above hoverStyle, which might be modified.
                    const hoverStyle = iconStyleEmphasisModel.getItemStyle();
                    const defaultTextPosition = isVertical
                        ? (
                            toolboxModel.get('right') == null && toolboxModel.get('left') !== 'right'
                                ? 'right' as const
                                : 'left' as const
                          )
                        : (
                            toolboxModel.get('bottom') == null && toolboxModel.get('top') !== 'bottom'
                                ? 'bottom' as const
                                : 'top' as const
                          );
                    textContent.setStyle({
                        fill: (iconStyleEmphasisModel.get('textFill')
                            || hoverStyle.fill || hoverStyle.stroke || tokens.color.neutral99) as string,
                        backgroundColor: iconStyleEmphasisModel.get('textBackgroundColor')
                    });
                    path.setTextConfig({
                        position: iconStyleEmphasisModel.get('textPosition') || defaultTextPosition
                    });
                    textContent.ignore = !toolboxModel.get('showTitle');

                    // Use enterEmphasis and leaveEmphasis provide by ec.
                    // There are flags managed by the echarts.
                    api.enterEmphasis(this);
                })
                .on('mouseout', function () {
                    if (featureModel.get(['iconStatus', iconName]) !== 'emphasis') {
                        api.leaveEmphasis(this);
                    }
                    textContent.hide();
                });
                (featureModel.get(['iconStatus', iconName]) === 'emphasis' ? enterEmphasis : leaveEmphasis)(path);

                group.add(path);
                (path as graphic.Path).on('click', bind(
                    feature.onclick, feature, ecModel, api, iconName
                ));

                iconPaths[iconName] = path;
            });
        }

        const refContainer = createBoxLayoutReference(toolboxModel, api).refContainer;
        const boxLayoutParams = toolboxModel.getBoxLayoutParams();
        const padding = toolboxModel.get('padding');
        const viewRect = getLayoutRect(
            boxLayoutParams,
            refContainer,
            padding
        );
        box(
            toolboxModel.get('orient'),
            group,
            toolboxModel.get('itemGap'),
            viewRect.width,
            viewRect.height
        );
        positionElement(
            group,
            boxLayoutParams,
            refContainer,
            padding
        );

        // Render background after group is layout
        // FIXME
        group.add(listComponentHelper.makeBackground(group.getBoundingRect(), toolboxModel));

        // Adjust icon title positions to avoid them out of screen
        isVertical || group.eachChild(function (icon: IconPath) {
            const titleText = (icon as ExtendedPath).__title;
            // const hoverStyle = icon.hoverStyle;

            // TODO simplify code?
            const emphasisState = icon.ensureState('emphasis');
            const emphasisTextConfig = emphasisState.textConfig || (emphasisState.textConfig = {});
            const textContent = icon.getTextContent();
            const emphasisTextState = textContent && textContent.ensureState('emphasis');
            // May be background element
            if (emphasisTextState && !isFunction(emphasisTextState) && titleText) {
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
                const topOffset = needPutOnTop ? (-5 - rect.height) : (itemSize + 10);
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
        each(this._features, function (feature) {
            feature
                && feature instanceof ToolboxFeature
                && feature.updateView
                && feature.updateView(feature.model, ecModel, api, payload);
        });
    }

    dispose(ecModel: GlobalModel, api: ExtensionAPI) {
        each(this._features, function (feature) {
            feature
                && feature instanceof ToolboxFeature
                && feature.dispose
                && feature.dispose(ecModel, api);
        });
    }
}


function isUserFeatureName(featureName: string): boolean {
    return featureName.indexOf('my') === 0;
}

function isTooltipFeature(feature: ToolboxFeature | UserDefinedToolboxFeature): feature is ToolboxFeature {
    return feature instanceof ToolboxFeature;
}

export default ToolboxView;
