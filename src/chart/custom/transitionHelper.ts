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

import { customInnerStore } from './CustomSeries';
import {
    separateMorph,
    combineMorph,
    morphPath,
    isCombineMorphing,
    SeparateConfig,
    CombineConfig
} from 'zrender/src/tool/morphPath';
import { Path } from '../../util/graphic';
import { SeriesModel } from '../../export/api';
import Element, { ElementAnimateConfig } from 'zrender/src/Element';
import { AnimationEasing } from 'zrender/src/animation/easing';
import { PayloadAnimationPart } from '../../util/types';
import { isArray, isFunction } from 'zrender/src/core/util';
import Displayable from 'zrender/src/graphic/Displayable';


type DescendentElements = Element[];
type DescendentPaths = Path[];

function isMultiple(elements: DescendentElements | DescendentElements[]): elements is DescendentElements[] {
    return isArray(elements[0]);
}

export function getMorphAnimationConfig(seriesModel: SeriesModel, dataIndex: number): ElementAnimateConfig {
    let duration: number;
    let easing: AnimationEasing;
    let delay: number;

    if (seriesModel.isAnimationEnabled()) {
        // PENDING: refactor? this is the same logic as `src/util/graphic.ts#animateOrSetProps`.
        let animationPayload: PayloadAnimationPart;
        if (seriesModel && seriesModel.ecModel) {
            const updatePayload = seriesModel.ecModel.getUpdatePayload();
            animationPayload = (updatePayload && updatePayload.animation) as PayloadAnimationPart;
        }
        if (animationPayload) {
            duration = animationPayload.duration || 0;
            easing = animationPayload.easing || 'cubicOut';
            delay = animationPayload.delay || 0;
        }
        else {
            easing = seriesModel.get('animationEasingUpdate');
            const delayOption = seriesModel.get('animationDelayUpdate');
            delay = isFunction(delayOption) ? delayOption(dataIndex) : delayOption;
            const durationOption = seriesModel.get('animationDurationUpdate');
            duration = isFunction(durationOption) ? durationOption(dataIndex) : durationOption;
        }
    }

    const config = {
        duration: duration || 0,
        delay: delay,
        easing: easing
    };

    return config;
}

export function applyMorphAnimation(
    from: DescendentPaths | DescendentPaths[],
    to: DescendentPaths | DescendentPaths[],
    seriesModel: SeriesModel,
    dataIndex: number,
    updateOtherProps: (fromIndividual: Path, toIndividual: Path, rawFrom: Path, rawTo: Path) => void
) {
    if (!from.length || !to.length) {
        return;
    }

    const animationCfg = getMorphAnimationConfig(seriesModel, dataIndex);

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

    if (many) {
        // TODO mergeByName
        for (let i = 0; i < one.length; i++) {
            const manyPaths: Path[] = [];
            for (let k = 0; k < many.length; k++) {
                if (many[k][i]) {
                    manyPaths.push(many[k][i]);
                }
            }
            let fromIndividuals;
            let toIndividuals;
            if (many === from) {    // manyToOne
                const res = combineMorph(
                    manyPaths, one[i], animationCfg as CombineConfig
                );
                fromIndividuals = res.fromIndividuals;
                toIndividuals = res.toIndividuals;
            }
            else {  // oneToMany
                const res = separateMorph(
                    one[i], manyPaths, animationCfg as SeparateConfig
                );

                fromIndividuals = res.fromIndividuals;
                toIndividuals = res.toIndividuals;
            }

            for (let i = 0; i < fromIndividuals.length; i++) {
                updateOtherProps(
                    fromIndividuals[i],
                    toIndividuals[i],
                    many === from ? manyPaths[i] : one[i],
                    many === from ? one[i] : manyPaths[i]
                );
            }
        }
    }
    else {  // oneToOne
        for (let i = 0; i < to.length; i++) {
            if (from[i]) {
                // Reuse the path.
                if (from[i] === to[i]) {
                    continue;
                }
                if (isCombineMorphing(from[i] as Path)) {
                    // Keep doing combine animation.
                    const {fromIndividuals, toIndividuals} = combineMorph(
                        [from[i] as Path], to[i] as Path, animationCfg as CombineConfig
                    );
                    for (let k = 0; k < fromIndividuals.length; k++) {
                        updateOtherProps(
                            fromIndividuals[k],
                            toIndividuals[k],
                            fromIndividuals[k],
                            toIndividuals[k]
                        );
                    }
                }
                else {
                    morphPath(from[i] as Path, to[i] as Path, animationCfg);
                    updateOtherProps(from[i] as Path, to[i] as Path, from[i] as Path, to[i] as Path);
                }
            }
        }
    }
}

export function getPathList(
    elements: Element, needsMorph?: boolean
): DescendentPaths;
export function getPathList(
    elements: Element[], needsMorph?: boolean
): DescendentPaths[];
export function getPathList(
    elements: Element | Element[], needsMorph?: boolean
): DescendentPaths | DescendentPaths[] {
    if (isArray(elements)) {
        const pathList = [];
        for (let i = 0; i < elements.length; i++) {
            pathList.push(getPathList(elements[i]));
        }
        return pathList as DescendentPaths[];
    }

    const pathList: DescendentPaths = [];

    elements.traverse(el => {
        if ((el instanceof Path) && (!needsMorph || customInnerStore(el).morph)) {
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