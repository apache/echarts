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
import {
    ToolboxFeatureModel,
    ToolboxFeatureOption,
    ToolboxFeature
} from '../featureManager';
import GlobalModel from '../../../model/Global';
import ExtensionAPI from '../../../core/ExtensionAPI';
import BrushModel from '../../brush/BrushModel';
import { BrushTypeUncertain } from '../../helper/BrushController';

const ICON_TYPES = ['rect', 'polygon', 'lineX', 'lineY', 'keep', 'clear'] as const;

type IconType = typeof ICON_TYPES[number];

export interface ToolboxBrushFeatureOption extends ToolboxFeatureOption {
    type?: IconType[]
    icon?: {[key in IconType]?: string}
    title?: {[key in IconType]?: string}
}

class BrushFeature extends ToolboxFeature<ToolboxBrushFeatureOption> {

    private _brushType: BrushTypeUncertain;
    private _brushMode: string;

    render(
        featureModel: ToolboxFeatureModel<ToolboxBrushFeatureOption>,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
        let brushType: BrushTypeUncertain;
        let brushMode: string;
        let isBrushed: boolean;

        ecModel.eachComponent({mainType: 'brush'}, function (brushModel: BrushModel) {
            brushType = brushModel.brushType;
            brushMode = brushModel.brushOption.brushMode || 'single';
            isBrushed = isBrushed || !!brushModel.areas.length;
        });
        this._brushType = brushType;
        this._brushMode = brushMode;

        zrUtil.each(featureModel.get('type', true), function (type) {
            featureModel.setIconStatus(
                type,
                (
                    type === 'keep'
                    ? brushMode === 'multiple'
                    : type === 'clear'
                    ? isBrushed
                    : type === brushType
                ) ? 'emphasis' : 'normal'
            );
        });
    }

    updateView(
        featureModel: ToolboxFeatureModel<ToolboxBrushFeatureOption>,
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
        this.render(featureModel, ecModel, api);
    }

    getIcons() {
        const model = this.model;
        const availableIcons = model.get('icon', true);
        const icons: ToolboxBrushFeatureOption['icon'] = {};
        zrUtil.each(model.get('type', true), function (type) {
            if (availableIcons[type]) {
                icons[type] = availableIcons[type];
            }
        });
        return icons;
    };

    onclick(ecModel: GlobalModel, api: ExtensionAPI, type: IconType) {
        const brushType = this._brushType;
        const brushMode = this._brushMode;

        if (type === 'clear') {
            // Trigger parallel action firstly
            api.dispatchAction({
                type: 'axisAreaSelect',
                intervals: []
            });

            api.dispatchAction({
                type: 'brush',
                command: 'clear',
                // Clear all areas of all brush components.
                areas: []
            });
        }
        else {
            api.dispatchAction({
                type: 'takeGlobalCursor',
                key: 'brush',
                brushOption: {
                    brushType: type === 'keep'
                        ? brushType
                        : (brushType === type ? false : type),
                    brushMode: type === 'keep'
                        ? (brushMode === 'multiple' ? 'single' : 'multiple')
                        : brushMode
                }
            });
        }
    };

    static getDefaultOption(ecModel: GlobalModel) {
        const defaultOption: ToolboxBrushFeatureOption = {
            show: true,
            type: ICON_TYPES.slice(),
            icon: {
                /* eslint-disable */
                rect: 'M7.3,34.7 M0.4,10V-0.2h9.8 M89.6,10V-0.2h-9.8 M0.4,60v10.2h9.8 M89.6,60v10.2h-9.8 M12.3,22.4V10.5h13.1 M33.6,10.5h7.8 M49.1,10.5h7.8 M77.5,22.4V10.5h-13 M12.3,31.1v8.2 M77.7,31.1v8.2 M12.3,47.6v11.9h13.1 M33.6,59.5h7.6 M49.1,59.5 h7.7 M77.5,47.6v11.9h-13', // jshint ignore:line
                polygon: 'M55.2,34.9c1.7,0,3.1,1.4,3.1,3.1s-1.4,3.1-3.1,3.1 s-3.1-1.4-3.1-3.1S53.5,34.9,55.2,34.9z M50.4,51c1.7,0,3.1,1.4,3.1,3.1c0,1.7-1.4,3.1-3.1,3.1c-1.7,0-3.1-1.4-3.1-3.1 C47.3,52.4,48.7,51,50.4,51z M55.6,37.1l1.5-7.8 M60.1,13.5l1.6-8.7l-7.8,4 M59,19l-1,5.3 M24,16.1l6.4,4.9l6.4-3.3 M48.5,11.6 l-5.9,3.1 M19.1,12.8L9.7,5.1l1.1,7.7 M13.4,29.8l1,7.3l6.6,1.6 M11.6,18.4l1,6.1 M32.8,41.9 M26.6,40.4 M27.3,40.2l6.1,1.6 M49.9,52.1l-5.6-7.6l-4.9-1.2', // jshint ignore:line
                lineX: 'M15.2,30 M19.7,15.6V1.9H29 M34.8,1.9H40.4 M55.3,15.6V1.9H45.9 M19.7,44.4V58.1H29 M34.8,58.1H40.4 M55.3,44.4 V58.1H45.9 M12.5,20.3l-9.4,9.6l9.6,9.8 M3.1,29.9h16.5 M62.5,20.3l9.4,9.6L62.3,39.7 M71.9,29.9H55.4', // jshint ignore:line
                lineY: 'M38.8,7.7 M52.7,12h13.2v9 M65.9,26.6V32 M52.7,46.3h13.2v-9 M24.9,12H11.8v9 M11.8,26.6V32 M24.9,46.3H11.8v-9 M48.2,5.1l-9.3-9l-9.4,9.2 M38.9-3.9V12 M48.2,53.3l-9.3,9l-9.4-9.2 M38.9,62.3V46.4', // jshint ignore:line
                keep: 'M4,10.5V1h10.3 M20.7,1h6.1 M33,1h6.1 M55.4,10.5V1H45.2 M4,17.3v6.6 M55.6,17.3v6.6 M4,30.5V40h10.3 M20.7,40 h6.1 M33,40h6.1 M55.4,30.5V40H45.2 M21,18.9h62.9v48.6H21V18.9z', // jshint ignore:line
                clear: 'M22,14.7l30.9,31 M52.9,14.7L22,45.7 M4.7,16.8V4.2h13.1 M26,4.2h7.8 M41.6,4.2h7.8 M70.3,16.8V4.2H57.2 M4.7,25.9v8.6 M70.3,25.9v8.6 M4.7,43.2v12.6h13.1 M26,55.8h7.8 M41.6,55.8h7.8 M70.3,43.2v12.6H57.2' // jshint ignore:line
                /* eslint-enable */
            },
            // `rect`, `polygon`, `lineX`, `lineY`, `keep`, `clear`
            title: ecModel.getLocaleModel().get(['toolbox', 'brush', 'title'])
        };

        return defaultOption;
    }
}

export default BrushFeature;
