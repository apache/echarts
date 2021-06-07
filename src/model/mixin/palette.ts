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

import {Dictionary} from 'zrender/src/core/types';
import {makeInner, normalizeToArray} from '../../util/model';
import Model from '../Model';
import {ZRColor, PaletteOptionMixin, DecalObject, AriaOptionMixin} from '../../util/types';
import GlobalModel from '../Global';

type Inner<T> = (hostObj: PaletteMixin<PaletteOptionMixin>) => {
    paletteIdx: number;
    paletteNameMap: Dictionary<T>;
};

const innerColor: Inner<ZRColor> = makeInner<{
    paletteIdx: number
    paletteNameMap: Dictionary<ZRColor>
}, PaletteMixin>();

const innerDecal: Inner<DecalObject> = makeInner<{
    paletteIdx: number
    paletteNameMap: Dictionary<DecalObject>
}, PaletteMixin>();



interface PaletteMixin<T extends PaletteOptionMixin = PaletteOptionMixin>
    extends Pick<Model<T>, 'get'> {}

class PaletteMixin<T extends PaletteOptionMixin = PaletteOptionMixin> {
    getColorFromPalette(
        this: PaletteMixin<T>,
        name: string,
        scope?: any,
        requestNum?: number
    ): ZRColor {
        const defaultPalette = normalizeToArray(this.get('color', true));
        const layeredPalette = this.get('colorLayer', true);
        return getFromPalette<ZRColor>(this, innerColor, defaultPalette, layeredPalette, name, scope, requestNum);
    }

    clearColorPalette(this: PaletteMixin<T>) {
        clearPalette<ZRColor>(this, innerColor);
    }
}

export function getDecalFromPalette(
    ecModel: GlobalModel,
    name: string,
    scope?: any,
    requestNum?: number
): DecalObject {
    const defaultDecals = normalizeToArray((ecModel as Model<AriaOptionMixin>).get(['aria', 'decal', 'decals']));
    return getFromPalette<DecalObject>(ecModel, innerDecal, defaultDecals, null, name, scope, requestNum);
}


function getNearestPalette<T>(
    palettes: T[][], requestColorNum: number
): T[] {
    const paletteNum = palettes.length;
    // TODO palettes must be in order
    for (let i = 0; i < paletteNum; i++) {
        if (palettes[i].length > requestColorNum) {
            return palettes[i];
        }
    }
    return palettes[paletteNum - 1];
}

/**
 * @param name MUST NOT be null/undefined. Otherwise call this function
 *             twise with the same parameters will get different result.
 * @param scope default this.
 * @return Can be null/undefined
 */
function getFromPalette<T>(
    that: PaletteMixin,
    inner: Inner<T>,
    defaultPalette: T[],
    layeredPalette: T[][],
    name: string,
    scope?: any,
    requestNum?: number
): T {
    scope = scope || that;
    const scopeFields = inner(scope);
    const paletteIdx = scopeFields.paletteIdx || 0;
    const paletteNameMap = scopeFields.paletteNameMap = scopeFields.paletteNameMap || {};
    // Use `hasOwnProperty` to avoid conflict with Object.prototype.
    if (paletteNameMap.hasOwnProperty(name)) {
        return paletteNameMap[name];
    }
    let palette = ((requestNum == null || !layeredPalette)
        ? defaultPalette : getNearestPalette(layeredPalette, requestNum));

    // In case can't find in layered color palette.
    palette = palette || defaultPalette;

    if (!palette || !palette.length) {
        return;
    }

    const pickedPaletteItem = palette[paletteIdx];
    if (name) {
        paletteNameMap[name] = pickedPaletteItem;
    }
    scopeFields.paletteIdx = (paletteIdx + 1) % palette.length;

    return pickedPaletteItem;
}

function clearPalette<T>(that: PaletteMixin, inner: Inner<T>) {
    inner(that).paletteIdx = 0;
    inner(that).paletteNameMap = {};
}

export {PaletteMixin};
