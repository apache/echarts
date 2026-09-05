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

import { extend } from 'zrender/src/core/util';
import SeriesModel from '../../model/Series';
import { Dictionary, DecalObject, InnerDecalObject } from '../../util/types';
import { getDecalFromPalette } from '../../model/mixin/palette';

type TreeDecalObject = DecalObject | 'none';

export default function enableAriaDecalForTree(seriesModel: SeriesModel) {
    const data = seriesModel.getData();
    const tree = data.tree;
    const decalPaletteScope: Dictionary<DecalObject> = {};

    tree.eachNode(node => {
        // Use decal of level 1 node
        let current = node;
        while (current && current.depth > 1) {
            current = current.parentNode;
        }

        const paletteDecal = getDecalFromPalette(
            seriesModel.ecModel,
            current.name || current.dataIndex + '',
            decalPaletteScope
        );
        const itemStyleDecal = node.getModel<any>()
            .getModel('itemStyle')
            .getShallow('decal') as TreeDecalObject;
        const specifiedDecal = itemStyleDecal != null
            ? itemStyleDecal
            : node.getVisual('decal') as TreeDecalObject;
        const decal = mergeDecal(specifiedDecal, paletteDecal);
        node.setVisual('decal', decal);
    });
}

function mergeDecal(specifiedDecal: TreeDecalObject, paletteDecal: DecalObject): TreeDecalObject {
    if (specifiedDecal === 'none') {
        return specifiedDecal;
    }

    const resultDecal = specifiedDecal
        ? extend(extend({}, paletteDecal), specifiedDecal)
        : paletteDecal;
    (resultDecal as InnerDecalObject).dirty = true;
    return resultDecal;
}
