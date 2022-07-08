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
    DividePath,
    isCombineMorphing,
    SeparateConfig
} from 'zrender/src/tool/morphPath';
import { Path } from '../util/graphic';
import SeriesModel from '../model/Series';
import Element, { ElementAnimateConfig } from 'zrender/src/Element';
import { defaults, isArray} from 'zrender/src/core/util';
import { getAnimationConfig } from './basicTransition';
import { ECElement, UniversalTransitionOption } from '../util/types';
import { clonePath } from 'zrender/src/tool/path';
import Model from '../model/Model';


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

const pathDividers: Record<UniversalTransitionOption['divideShape'], DividePath> = {
    clone(params) {
        const ret: Path[] = [];
        // Fitting the alpha
        const approxOpacity = 1 - Math.pow(1 - params.path.style.opacity, 1 / params.count);
        for (let i = 0; i < params.count; i++) {
            const cloned = clonePath(params.path);
            cloned.setStyle('opacity', approxOpacity);
            ret.push(cloned);
        }
        return ret;
    },
    // Use the default divider
    split: null
};

export function applyMorphAnimation(
    from: DescendentPaths | DescendentPaths[],
    to: DescendentPaths | DescendentPaths[],
    divideShape: UniversalTransitionOption['divideShape'],
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

    const updateAnimationCfg = getAnimationConfig('update', seriesModel, dataIndex);
    if (!(updateAnimationCfg && updateAnimationCfg.duration > 0)) {
        return;
    }
    const animationDelay = (seriesModel.getModel('universalTransition') as Model<UniversalTransitionOption>)
        .get('delay');


    const animationCfg = Object.assign({
        // Need to setToFinal so the further calculation based on the style can be correct.
        // Like emphasis color.
        setToFinal: true
    } as SeparateConfig, updateAnimationCfg);


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

    function morphOneBatch(
        batch: MorphingBatch,
        fromIsMany: boolean,
        animateIndex: number,
        animateCount: number,
        forceManyOne?: boolean
    ) {
        const batchMany = batch.many;
        const batchOne = batch.one;
        if (batchMany.length === 1 && !forceManyOne) {
            // Is one to one
            const batchFrom: Path = fromIsMany ? batchMany[0] : batchOne;
            const batchTo: Path = fromIsMany ? batchOne : batchMany[0];

            if (isCombineMorphing(batchFrom as Path)) {
                // Keep doing combine animation.
                morphOneBatch({
                    many: [batchFrom as Path],
                    one: batchTo as Path
                }, true, animateIndex, animateCount, true);
            }
            else {
                const individualAnimationCfg = animationDelay ? defaults({
                    delay: animationDelay(animateIndex, animateCount)
                } as ElementAnimateConfig, animationCfg) : animationCfg;
                morphPath(batchFrom, batchTo, individualAnimationCfg);
                animateOtherProps(batchFrom, batchTo, batchFrom, batchTo, individualAnimationCfg);
            }
        }
        else {
            const separateAnimationCfg = defaults({
                dividePath: pathDividers[divideShape],
                individualDelay: animationDelay && function (idx, count, fromPath, toPath) {
                    return animationDelay(idx + animateIndex, animateCount);
                }
            } as SeparateConfig, animationCfg);

            const {
                fromIndividuals,
                toIndividuals
            } = fromIsMany
                ? combineMorph(batchMany, batchOne, separateAnimationCfg)
                : separateMorph(batchOne, batchMany, separateAnimationCfg);

            const count = fromIndividuals.length;
            for (let k = 0; k < count; k++) {
                const individualAnimationCfg = animationDelay ? defaults({
                    delay: animationDelay(k, count)
                } as ElementAnimateConfig, animationCfg) : animationCfg;
                animateOtherProps(
                    fromIndividuals[k],
                    toIndividuals[k],
                    fromIsMany ? batchMany[k] : batch.one,
                    fromIsMany ? batch.one : batchMany[k],
                    individualAnimationCfg
                );
            }
        }
    }

    const fromIsMany = many
        ? many === from
        // Is one to one. If the path number not match. also needs do merge and separate morphing.
        : from.length > to.length;

    const morphBatches = many
        ? prepareMorphBatches(one, many)
        : prepareMorphBatches(
            (fromIsMany ? to : from) as DescendentPaths,
            [(fromIsMany ? from : to) as DescendentPaths]
        );
    let animateCount = 0;
    for (let i = 0; i < morphBatches.length; i++) {
        animateCount += morphBatches[i].many.length;
    }
    let animateIndex = 0;
    for (let i = 0; i < morphBatches.length; i++) {
        morphOneBatch(morphBatches[i], fromIsMany, animateIndex, animateCount);
        animateIndex += morphBatches[i].many.length;
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
        if ((el instanceof Path) && !(el as ECElement).disableMorphing && !el.invisible && !el.ignore) {
            pathList.push(el);
        }
    });
    return pathList;
}