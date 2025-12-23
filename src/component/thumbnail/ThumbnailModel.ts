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

import ComponentModel from '../../model/Component';
import { error } from '../../util/log';
import {
    BoxLayoutOptionMixin, ComponentOnCalendarOptionMixin,
    ComponentOnMatrixOptionMixin, ComponentOption, ItemStyleOption, NullUndefined,
} from '../../util/types';
import tokens from '../../visual/tokens';
import {
    injectThumbnailBridge
} from '../helper/thumbnailBridge';
import { ThumbnailBridgeImpl } from './ThumbnailBridgeImpl';

/**
 * [NOTE]: thumbnail is implemented as a component, rather than internal data strucutrue,
 *  due to the possibility of serveing geo and related series with a single thumbnail,
 *  and enable to apply some common layout feature, such as matrix coord sys.
 */

// TODO: currently only graph supports thumbnail.
// May need some refactor if serving new components in future.

export interface ThumbnailOption extends
    ComponentOption, BoxLayoutOptionMixin,
    ComponentOnCalendarOptionMixin, ComponentOnMatrixOptionMixin {

    mainType?: 'thumbnail'

    show?: boolean

    itemStyle?: ItemStyleOption
    windowStyle?: ItemStyleOption

    seriesIndex?: number | number[]
    seriesId?: string | string[]
}

export interface ThumbnailZ2Setting {
    background: number;
    window: number;
}

export class ThumbnailModel extends ComponentModel<ThumbnailOption> {
    static type = 'thumbnail' as const;
    type = ThumbnailModel.type;

    static layoutMode = 'box' as const;

    preventAutoZ = true;

    // All the supported components should be added here.
    static dependencies = ['series', 'geo'];

    static defaultOption: ThumbnailOption = {
        show: true,
        right: 1,
        bottom: 1,
        height: '25%',
        width: '25%',

        itemStyle: {
            // Use echarts option.backgorundColor by default.
            borderColor: tokens.color.border,
            borderWidth: 2
        },

        windowStyle: {
            borderWidth: 1,
            color: tokens.color.neutral30,
            borderColor: tokens.color.neutral40,
            opacity: 0.3
        },

        z: 10,

    };

    // Never remove after created.
    private _birdge: ThumbnailBridgeImpl;

    private _target: {
        baseMapProvider: ComponentModel | NullUndefined
        // May extend.
    } | NullUndefined;

    optionUpdated(newCptOption: ThumbnailOption, isInit: boolean): void {
        this._updateBridge();
    }

    private _updateBridge() {
        const bridge = this._birdge = this._birdge || new ThumbnailBridgeImpl(this);

        // Clear all, in case of option changed.
        this._target = null;
        this.ecModel.eachSeries(series => {
            injectThumbnailBridge(series, null);
        });

        if (this.shouldShow()) {
            const target = this.getTarget();
            // If a component is targeted by more than one thumbnails, simply only the last one works.
            injectThumbnailBridge(target.baseMapProvider, bridge);
        }
    }

    shouldShow() {
        return this.getShallow('show', true);
    }

    getBridge(): ThumbnailBridgeImpl {
        return this._birdge;
    }

    getTarget(): {
        baseMapProvider: ComponentModel | NullUndefined
        // May extend.
    } {
        if (this._target) {
            return this._target;
        }

        // Find by `seriesId`/`seriesIndex`.
        let series = this.getReferringComponents('series', {
            useDefault: false, enableAll: false, enableNone: false
        }).models[0];
        if (series) {
            if (series.subType !== 'graph') {
                series = null;
                if (__DEV__) {
                    error(`series.${series.subType} is not supported in thumbnail.`, true);
                }
            }
        }
        else {
            // If no xxxId and xxxIndex specified, find the first series.graph. If other components,
            // such as geo, is supported in future, the default stretagy may be extended.
            series = this.ecModel.queryComponents({mainType: 'series', subType: 'graph'})[0];
        }

        this._target = {
            baseMapProvider: series
        };

        return this._target;
    }

}
