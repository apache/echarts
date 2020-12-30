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
import { Dictionary, DisplayState, ZRElementEvent, ItemStyleOption, LabelOption } from '../../util/types';
import Model from '../../model/Model';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
// import * as graphic from '../../util/graphic';
import Displayable from 'zrender/src/graphic/Displayable';

// type IconPath = ReturnType<typeof graphic.createIcon>;

type IconStyle = ItemStyleOption & {
    // TODO Move to a individual textStyle option
    textFill?: LabelOption['color']
    textBackgroundColor?: LabelOption['backgroundColor']
    textPosition?: LabelOption['position']
    textAlign?: LabelOption['align']
    textBorderRadius?: LabelOption['borderRadius']
    textPadding?: LabelOption['padding']
};
export interface ToolboxFeatureOption {

    show?: boolean

    title?: string | Partial<Dictionary<string>>

    icon?: string | Partial<Dictionary<string>>

    iconStyle?: IconStyle
    emphasis?: {
        iconStyle?: IconStyle
    }

    iconStatus?: Partial<Dictionary<DisplayState>>

    onclick?: () => void
}

export interface ToolboxFeatureModel<Opts extends ToolboxFeatureOption = ToolboxFeatureOption> extends Model<Opts> {

    /**
     * Collection of icon paths.
     * Will be injected during rendering in the view.
     */
    iconPaths: Partial<Dictionary<Displayable>>

    setIconStatus(iconName: string, status: DisplayState): void
}

interface ToolboxFeature<Opts extends ToolboxFeatureOption = ToolboxFeatureOption> {
    getIcons?(): Dictionary<string>

    onclick(ecModel: GlobalModel, api: ExtensionAPI, type: string, event: ZRElementEvent): void

    dispose?(ecModel: GlobalModel, api: ExtensionAPI): void
    remove?(ecModel: GlobalModel, api: ExtensionAPI): void

    render(featureModel: ToolboxFeatureModel, model: GlobalModel, api: ExtensionAPI, payload: unknown): void
    updateView?(featureModel: ToolboxFeatureModel, model: GlobalModel, api: ExtensionAPI, payload: unknown): void
}
abstract class ToolboxFeature<Opts extends ToolboxFeatureOption = ToolboxFeatureOption> {
    uid: string;

    model: ToolboxFeatureModel<Opts>;
    ecModel: GlobalModel;
    api: ExtensionAPI;

    /**
     * If toolbox feature can't be used on some platform.
     */
    unusable?: boolean;
}

export {ToolboxFeature};

export interface UserDefinedToolboxFeature {
    uid: string

    model: ToolboxFeatureModel
    ecModel: GlobalModel
    api: ExtensionAPI

    featureName?: string

    onclick(): void
}

type ToolboxFeatureCtor = {
    new(): ToolboxFeature
    /**
     * Static defaultOption property
     */
    defaultOption?: ToolboxFeatureOption
    getDefaultOption?: (ecModel: GlobalModel) => ToolboxFeatureOption
};

const features: Dictionary<ToolboxFeatureCtor> = {};

export function registerFeature(name: string, ctor: ToolboxFeatureCtor) {
    features[name] = ctor;
}

export function getFeature(name: string) {
    return features[name];
}
