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
import { clone, isArray, isFunction } from 'zrender/src/core/util';

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

function getMorphPathList(el: Element): Path[] {
    const pathList: Path[] = [];
    el.traverse(child => {
        if ((child instanceof Path) && customInnerStore(child).morph) {
            pathList.push(child);
        }
    });
    return pathList;
}

export function applyMorphAnimation(
    from: Element[] | Element,
    to: Element[] | Element,
    seriesModel: SeriesModel,
    dataIndex: number,
    updateOtherProps: (fromIndividual: Path, toIndividual: Path, rawFrom: Path, rawTo: Path) => void
) {
    const animationCfg = getMorphAnimationConfig(seriesModel, dataIndex);

    let many: Element[];
    let one: Element;
    if (isArray(from)) {    // manyToOne
        many = from;
        one = to as Element;
    }
    if (isArray(to)) { // oneToMany
        many = to;
        one = from as Element;
    }

    if (many) {
        // TODO mergeByName
        const manyPathsList: Path[][] = [];
        for (let i = 0; i < many.length; i++) {
            manyPathsList[i] = getMorphPathList(many[i]);
        }
        const onePaths = getMorphPathList(one as Element);

        for (let i = 0; i < onePaths.length; i++) {
            const manyPaths: Path[] = [];
            for (let k = 0; k < manyPathsList.length; k++) {
                if (manyPathsList[k][i]) {
                    manyPaths.push(manyPathsList[k][i]);
                }
            }
            let fromIndividuals;
            let toIndividuals;
            if (many === from) {    // manyToOne
                const res = combineMorph(
                    manyPaths, onePaths[i], animationCfg as CombineConfig
                );
                fromIndividuals = res.fromIndividuals;
                toIndividuals = res.toIndividuals;
            }
            else {  // oneToMany
                const res = separateMorph(
                    onePaths[i], manyPaths, animationCfg as SeparateConfig
                );

                fromIndividuals = res.fromIndividuals;
                toIndividuals = res.toIndividuals;
            }

            for (let i = 0; i < fromIndividuals.length; i++) {
                updateOtherProps(
                    fromIndividuals[i],
                    toIndividuals[i],
                    many === from ? manyPaths[i] : onePaths[i],
                    many === from ? onePaths[i] : manyPaths[i]
                );
            }
        }
    }
    else {  // oneToOne
        const fromPaths = getMorphPathList(from as Element);
        const toPaths = getMorphPathList(to as Element);

        for (let i = 0; i < toPaths.length; i++) {
            if (fromPaths[i]) {
                if (isCombineMorphing(fromPaths[i])) {
                    // Keep doing combine animation.
                    const {fromIndividuals, toIndividuals} = combineMorph(
                        [fromPaths[i]], toPaths[i], animationCfg as CombineConfig
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
                    morphPath(fromPaths[i], toPaths[i], animationCfg);
                    updateOtherProps(fromPaths[i], toPaths[i], fromPaths[i], toPaths[i]);
                }
            }
        }
    }
}

function copyPropsWhenDivided(
    srcPath: Path,
    tarPath: Path,
    willClone: boolean
): void {
    // If just carry the style, will not be modifed, so do not copy.
    tarPath.style = willClone
        ? clone(srcPath.style)
        : srcPath.style;

    tarPath.zlevel = srcPath.zlevel;
    tarPath.z = srcPath.z;
    tarPath.z2 = srcPath.z2;
}
