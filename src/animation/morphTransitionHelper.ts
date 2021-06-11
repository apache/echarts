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

import {
    separateMorph,
    combineMorph,
    morphPath,
    isCombineMorphing
} from 'zrender/src/tool/morphPath';
import { Path } from '../util/graphic';
import { SeriesModel } from '../export/api';
import Element, { ElementAnimateConfig } from 'zrender/src/Element';
import { defaults, isArray} from 'zrender/src/core/util';
import Displayable from 'zrender/src/graphic/Displayable';
import { getAnimationConfig } from './basicTrasition';
import { ECElement } from '../util/types';


type DescendentElements = Element[];
type DescendentPaths = Path[];

function isMultiple(elements: DescendentElements | DescendentElements[]): elements is DescendentElements[] {
    return isArray(elements[0]);
}

interface MorphingBatch {
    one: Path;
    many: Path[];
}

function prepareMorphBatches(one: DescendentPaths, many: DescendentPaths[]) {
    const batches: MorphingBatch[] = [];
    const batchCount = one.length;
    for (let i = 0; i < batchCount; i++) {
        batches.push({
            one: one[i],
            many: []
        });
    }

    for (let i = 0; i < many.length; i++) {
        const len = many[i].length;
        let k;
        for (k = 0; k < len; k++) {
            batches[k % batchCount].many.push(many[i][k]);
        }
    }

    let off = 0;
    // If one has more paths than each one of many. average them.
    for (let i = batchCount - 1; i >= 0; i--) {
        if (!batches[i].many.length) {
            const moveFrom = batches[off].many;
            if (moveFrom.length <= 1) { // Not enough
                // Start from the first one.
                if (off) {
                    off = 0;
                }
                else {
                    return batches;
                }
            }
            const len = moveFrom.length;
            const mid = Math.ceil(len / 2);
            batches[i].many = moveFrom.slice(mid, len);
            batches[off].many = moveFrom.slice(0, mid);

            off++;
        }
    }

    return batches;
}

export function applyMorphAnimation(
    from: DescendentPaths | DescendentPaths[],
    to: DescendentPaths | DescendentPaths[],
    seriesModel: SeriesModel,
    dataIndex: number,
    animateOtherProps: (
        fromIndividual: Path,
        toIndividual: Path,
        rawFrom: Path,
        rawTo: Path,
        animationCfg: ElementAnimateConfig
    ) => void
) {
    if (!from.length || !to.length) {
        return;
    }

    const animationCfg = getAnimationConfig('update', seriesModel, dataIndex);

    let many: DescendentPaths[];
    let one: DescendentPaths;
    if (isMultiple(from)) {    // manyToOne
        many = from;
        one = to as DescendentPaths;
    }
    if (isMultiple(to)) { // oneToMany
        many = to;
        one = from as DescendentPaths;
    }

    const animationCfgWithSplitPath = defaults({
    }, animationCfg);

    function morphOneBatch(batch: MorphingBatch, fromIsMany: boolean, forceManyOne?: boolean) {
        const batchMany = batch.many;
        const batchOne = batch.one;
        if (batchMany.length === 1 && !forceManyOne) {
            // Is one to one
            const batchFrom: Path = fromIsMany ? batchMany[0] : batchOne;
            const batchTo: Path = fromIsMany ? batchOne : batchMany[0];
            // Path is reused.
            if (batchFrom === batchTo) {
                return;
            }

            if (isCombineMorphing(batchFrom as Path)) {
                // Keep doing combine animation.
                morphOneBatch({
                    many: [batchFrom as Path],
                    one: batchTo as Path
                }, true, true);
            }
            else {
                morphPath(batchFrom, batchTo, animationCfg);
                animateOtherProps(batchFrom, batchTo, batchFrom, batchTo, animationCfg);
            }
        }
        else {
            const {
                fromIndividuals,
                toIndividuals
            } = fromIsMany
                ? combineMorph(batchMany, batchOne, animationCfgWithSplitPath)
                : separateMorph(batchOne, batchMany, animationCfgWithSplitPath);

            for (let k = 0; k < fromIndividuals.length; k++) {
                animateOtherProps(
                    fromIndividuals[k],
                    toIndividuals[k],
                    fromIsMany ? batchMany[k] : batch.one,
                    fromIsMany ? batch.one : batchMany[k], animationCfg
                );
            }
        }
    }

    const fromIsMany = many
        ? many === from
        // Is one to one. If the path number not match. also needs do merge and separate morphing.
        : from.length > to.length;

    // TODO mergeByName
    const morphBatches = many
        ? prepareMorphBatches(one, many)
        : prepareMorphBatches(
                (fromIsMany ? to : from) as DescendentPaths,
                [(fromIsMany ? from : to) as DescendentPaths]
            );
    for (let i = 0; i < morphBatches.length; i++) {
        morphOneBatch(morphBatches[i], fromIsMany);
    }
}

export function getPathList(
    elements: Element
): DescendentPaths;
export function getPathList(
    elements: Element[]
): DescendentPaths[];
export function getPathList(
    elements: Element | Element[]
): DescendentPaths | DescendentPaths[] {
    if (!elements) {
        return [];
    }

    if (isArray(elements)) {
        const pathList = [];
        for (let i = 0; i < elements.length; i++) {
            pathList.push(getPathList(elements[i]));
        }
        return pathList as DescendentPaths[];
    }

    const pathList: DescendentPaths = [];

    elements.traverse(el => {
        if ((el instanceof Path) && !(el as ECElement).disableMorphing) {
            pathList.push(el);
        }
    });
    return pathList;
}


export function isPath(el: Element): el is Path {
    return el instanceof Path;
}
export function isDisplayable(el: Element) : el is Displayable {
    return el instanceof Displayable;
}

export function copyElement(sourceEl: Element, targetEl: Element) {
    targetEl.copyTransform(sourceEl);
    if (isDisplayable(targetEl) && isDisplayable(sourceEl)) {
        targetEl.setStyle(sourceEl.style);
        targetEl.z = sourceEl.z;
        targetEl.z2 = sourceEl.z2;
        targetEl.zlevel = sourceEl.zlevel;
        targetEl.invisible = sourceEl.invisible;
        targetEl.ignore = sourceEl.ignore;

        if (isPath(targetEl) && isPath(sourceEl)) {
            targetEl.setShape(sourceEl.shape);
        }
    }
}