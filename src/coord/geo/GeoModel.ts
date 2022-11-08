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
import * as modelUtil from '../../util/model';
import ComponentModel from '../../model/Component';
import Model from '../../model/Model';
import geoCreator from './geoCreator';
import Geo from './Geo';
import {
    ComponentOption,
    BoxLayoutOptionMixin,
    ItemStyleOption,
    ZRColor,
    LabelOption,
    DisplayState,
    RoamOptionMixin,
    AnimationOptionMixin,
    StatesOptionMixin,
    Dictionary,
    CommonTooltipOption,
    StatesMixinBase
} from '../../util/types';
import { GeoProjection, NameMap } from './geoTypes';
import GlobalModel from '../../model/Global';
import geoSourceManager from './geoSourceManager';


export interface GeoItemStyleOption<TCbParams = never> extends ItemStyleOption<TCbParams> {
    areaColor?: ZRColor;
};
interface GeoLabelOption extends LabelOption {
    formatter?: string | ((params: GeoLabelFormatterDataParams) => string);
}
export interface GeoStateOption {
    itemStyle?: GeoItemStyleOption
    // FIXME:TS formatter?
    label?: GeoLabelOption
}
interface GeoLabelFormatterDataParams {
    name: string;
    status: DisplayState;
}

export interface RegoinOption extends GeoStateOption, StatesOptionMixin<GeoStateOption, StatesMixinBase> {
    name?: string
    selected?: boolean
    tooltip?: CommonTooltipOption<GeoTooltipFormatterParams>
}

export interface GeoTooltipFormatterParams {
    componentType: 'geo'
    geoIndex: number
    name: string
    $vars: ['name']
}


export interface GeoCommonOptionMixin extends RoamOptionMixin {
    // Map name
    map: string;

    // Aspect is width / height. Inited to be geoJson bbox aspect
    // This parameter is used for scale this aspect
    aspectScale?: number;

    // Layout with center and size
    // If you want to put map in a fixed size box with right aspect ratio
    // This two properties may be more convenient
    // Like: `40` or `'50%'`.
    layoutCenter?: (number | string)[];
    // Like: `40` or `'50%'`.
    layoutSize?: number | string;

    // Define left-top, right-bottom lng/lat coords to control view
    // For example, [ [180, 90], [-180, -90] ]
    // higher priority than center and zoom
    boundingCoords?: number[][];

    nameMap?: NameMap;
    nameProperty?: string;

    /**
     * Use raw projection by default
     * Only available for GeoJSON source.
     *
     * NOTE: `center` needs to be the projected coord if projection is used.
     */
    projection?: GeoProjection;
}

export interface GeoOption extends
    ComponentOption,
    BoxLayoutOptionMixin,
    // For lens animation on geo.
    AnimationOptionMixin,
    GeoCommonOptionMixin,
    StatesOptionMixin<GeoStateOption, StatesMixinBase>, GeoStateOption {
    mainType?: 'geo';

    show?: boolean;
    silent?: boolean;

    regions?: RegoinOption[];

    stateAnimation?: AnimationOptionMixin

    selectedMode?: 'single' | 'multiple' | boolean
    selectedMap?: Dictionary<boolean>

    tooltip?: CommonTooltipOption<GeoTooltipFormatterParams>
}

class GeoModel extends ComponentModel<GeoOption> {

    static type = 'geo';
    readonly type = GeoModel.type;

    coordinateSystem: Geo;

    static layoutMode = 'box' as const;

    private _optionModelMap: zrUtil.HashMap<Model<RegoinOption>>;

    static defaultOption: GeoOption = {

        // zlevel: 0,

        z: 0,

        show: true,

        left: 'center',

        top: 'center',

        // Default value:
        // for geoSVG source: 1,
        // for geoJSON source: 0.75.
        aspectScale: null,

        // /// Layout with center and size
        // If you want to put map in a fixed size box with right aspect ratio
        // This two properties may be more convenient
        // layoutCenter: [50%, 50%]
        // layoutSize: 100

        silent: false,

        // Map type
        map: '',

        // Define left-top, right-bottom coords to control view
        // For example, [ [180, 90], [-180, -90] ]
        boundingCoords: null,

        // Default on center of map
        center: null,

        zoom: 1,

        scaleLimit: null,

        // selectedMode: false

        label: {
            show: false,
            color: '#000'
        },

        itemStyle: {
            borderWidth: 0.5,
            borderColor: '#444'
            // Default color:
            // + geoJSON: #eee
            // + geoSVG: null (use SVG original `fill`)
            // color: '#eee'
        },

        emphasis: {
            label: {
                show: true,
                color: 'rgb(100,0,0)'
            },
            itemStyle: {
                color: 'rgba(255,215,0,0.8)'
            }
        },

        select: {
            label: {
                show: true,
                color: 'rgb(100,0,0)'
            },
            itemStyle: {
                color: 'rgba(255,215,0,0.8)'
            }
        },

        regions: []

        // tooltip: {
        //     show: false
        // }
    };

    init(option: GeoOption, parentModel: Model, ecModel: GlobalModel): void {
        const source = geoSourceManager.getGeoResource(option.map);
        if (source && source.type === 'geoJSON') {
            const itemStyle = option.itemStyle = option.itemStyle || {};
            if (!('color' in itemStyle)) {
                itemStyle.color = '#eee';
            }
        }

        this.mergeDefaultAndTheme(option, ecModel);

        // Default label emphasis `show`
        modelUtil.defaultEmphasis(option, 'label', ['show']);
    }

    optionUpdated(): void {
        const option = this.option;

        option.regions = geoCreator.getFilledRegions(
            option.regions, option.map, option.nameMap, option.nameProperty
        );

        const selectedMap: Dictionary<boolean> = {};
        this._optionModelMap = zrUtil.reduce(option.regions || [], (optionModelMap, regionOpt) => {
            const regionName = regionOpt.name;
            if (regionName) {
                optionModelMap.set(regionName, new Model(regionOpt, this, this.ecModel));
                if (regionOpt.selected) {
                    selectedMap[regionName] = true;
                }
            }
            return optionModelMap;
        }, zrUtil.createHashMap());

        if (!option.selectedMap) {
            option.selectedMap = selectedMap;
        }
    }

    /**
     * Get model of region.
     */
    getRegionModel(name: string): Model<RegoinOption> {
        return this._optionModelMap.get(name) || new Model(null, this, this.ecModel);
    }

    /**
     * Format label
     * @param name Region name
     */
    getFormattedLabel(name: string, status?: DisplayState) {
        const regionModel = this.getRegionModel(name);
        const formatter = status === 'normal'
            ? regionModel.get(['label', 'formatter'])
            : regionModel.get(['emphasis', 'label', 'formatter']);
        const params = {
            name: name
        } as GeoLabelFormatterDataParams;
        if (zrUtil.isFunction(formatter)) {
            params.status = status;
            return formatter(params);
        }
        else if (zrUtil.isString(formatter)) {
            return formatter.replace('{a}', name != null ? name : '');
        }
    }

    setZoom(zoom: number): void {
        this.option.zoom = zoom;
    }

    setCenter(center: number[]): void {
        this.option.center = center;
    }

    // PENGING If selectedMode is null ?
    select(name?: string): void {
        const option = this.option;
        const selectedMode = option.selectedMode;
        if (!selectedMode) {
            return;
        }
        if (selectedMode !== 'multiple') {
            option.selectedMap = null;
        }

        const selectedMap = option.selectedMap || (option.selectedMap = {});
        selectedMap[name] = true;
    }

    unSelect(name?: string): void {
        const selectedMap = this.option.selectedMap;
        if (selectedMap) {
            selectedMap[name] = false;
        }
    }

    toggleSelected(name?: string): void {
        this[this.isSelected(name) ? 'unSelect' : 'select'](name);
    }

    isSelected(name?: string): boolean {
        const selectedMap = this.option.selectedMap;
        return !!(selectedMap && selectedMap[name]);
    }

}

export default GeoModel;
