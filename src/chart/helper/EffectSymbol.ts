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
import {createSymbol} from '../../util/symbol';
import {Group, Path} from '../../util/graphic';
import { enterEmphasis, leaveEmphasis, enableHoverEmphasis } from '../../util/states';
import {parsePercent} from '../../util/number';
import SymbolClz from './Symbol';
import List from '../../data/List';
import type { ZRColor, ECElement } from '../../util/types';
import type Displayable from 'zrender/src/graphic/Displayable';
import { SymbolDrawItemModelOption } from './SymbolDraw';

const EFFECT_RIPPLE_NUMBER = 3;

interface RippleEffectCfg {
    showEffectOn?: 'emphasis' | 'render'
    rippleScale?: number
    brushType?: 'fill' | 'stroke'
    period?: number
    effectOffset?: number
    z?: number
    zlevel?: number
    symbolType?: string
    color?: ZRColor
    rippleEffectColor?: ZRColor
}

function normalizeSymbolSize(symbolSize: number | number[]): number[] {
    if (!zrUtil.isArray(symbolSize)) {
        symbolSize = [+symbolSize, +symbolSize];
    }
    return symbolSize;
}

function updateRipplePath(rippleGroup: Group, effectCfg: RippleEffectCfg) {
    const color = effectCfg.rippleEffectColor || effectCfg.color;
    rippleGroup.eachChild(function (ripplePath: Displayable) {
        ripplePath.attr({
            z: effectCfg.z,
            zlevel: effectCfg.zlevel,
            style: {
                stroke: effectCfg.brushType === 'stroke' ? color : null,
                fill: effectCfg.brushType === 'fill' ? color : null
            }
        });
    });
}

class EffectSymbol extends Group {

    private _effectCfg: RippleEffectCfg;

    constructor(data: List, idx: number) {
        super();

        const symbol = new SymbolClz(data, idx);
        const rippleGroup = new Group();
        this.add(symbol);
        this.add(rippleGroup);

        this.updateData(data, idx);
    }


    stopEffectAnimation() {
        (this.childAt(1) as Group).removeAll();
    }

    startEffectAnimation(effectCfg: RippleEffectCfg) {
        const symbolType = effectCfg.symbolType;
        const color = effectCfg.color;
        const rippleGroup = this.childAt(1) as Group;

        for (let i = 0; i < EFFECT_RIPPLE_NUMBER; i++) {
            // If width/height are set too small (e.g., set to 1) on ios10
            // and macOS Sierra, a circle stroke become a rect, no matter what
            // the scale is set. So we set width/height as 2. See #4136.
            const ripplePath = createSymbol(
                symbolType, -1, -1, 2, 2, color
            );
            ripplePath.attr({
                style: {
                    strokeNoScale: true
                },
                z2: 99,
                silent: true,
                scaleX: 0.5,
                scaleY: 0.5
            });

            const delay = -i / EFFECT_RIPPLE_NUMBER * effectCfg.period + effectCfg.effectOffset;
            // TODO Configurable effectCfg.period
            ripplePath.animate('', true)
                .when(effectCfg.period, {
                    scale: [effectCfg.rippleScale / 2, effectCfg.rippleScale / 2]
                })
                .delay(delay)
                .start();
            ripplePath.animateStyle(true)
                .when(effectCfg.period, {
                    opacity: 0
                })
                .delay(delay)
                .start();

            rippleGroup.add(ripplePath);
        }

        updateRipplePath(rippleGroup, effectCfg);
    }

    /**
     * Update effect symbol
     */
    updateEffectAnimation(effectCfg: RippleEffectCfg) {
        const oldEffectCfg = this._effectCfg;
        const rippleGroup = this.childAt(1) as Group;

        // Must reinitialize effect if following configuration changed
        const DIFFICULT_PROPS = ['symbolType', 'period', 'rippleScale'] as const;
        for (let i = 0; i < DIFFICULT_PROPS.length; i++) {
            const propName = DIFFICULT_PROPS[i];
            if (oldEffectCfg[propName] !== effectCfg[propName]) {
                this.stopEffectAnimation();
                this.startEffectAnimation(effectCfg);
                return;
            }
        }

        updateRipplePath(rippleGroup, effectCfg);
    }

    /**
     * Highlight symbol
     */
    highlight() {
        enterEmphasis(this);
    }

    /**
     * Downplay symbol
     */
    downplay() {
        leaveEmphasis(this);
    }

    /**
     * Update symbol properties
     */
    updateData(data: List, idx: number) {
        const seriesModel = data.hostModel;

        (this.childAt(0) as SymbolClz).updateData(data, idx);

        const rippleGroup = this.childAt(1);
        const itemModel = data.getItemModel<SymbolDrawItemModelOption>(idx);
        const symbolType = data.getItemVisual(idx, 'symbol');
        const symbolSize = normalizeSymbolSize(data.getItemVisual(idx, 'symbolSize'));

        const symbolStyle = data.getItemVisual(idx, 'style');
        const color = symbolStyle && symbolStyle.fill;

        rippleGroup.setScale(symbolSize);

        rippleGroup.traverse(function (ripplePath: Path) {
            ripplePath.setStyle('fill', color);
        });

        const symbolOffset = itemModel.getShallow('symbolOffset');
        if (symbolOffset) {
            rippleGroup.x = parsePercent(symbolOffset[0], symbolSize[0]);
            rippleGroup.y = parsePercent(symbolOffset[1], symbolSize[1]);
        }
        const symbolRotate = data.getItemVisual(idx, 'symbolRotate');
        rippleGroup.rotation = (symbolRotate || 0) * Math.PI / 180 || 0;

        const effectCfg: RippleEffectCfg = {};

        effectCfg.showEffectOn = seriesModel.get('showEffectOn');
        effectCfg.rippleScale = itemModel.get(['rippleEffect', 'scale']);
        effectCfg.brushType = itemModel.get(['rippleEffect', 'brushType']);
        effectCfg.period = itemModel.get(['rippleEffect', 'period']) * 1000;
        effectCfg.effectOffset = idx / data.count();
        effectCfg.z = seriesModel.getShallow('z') || 0;
        effectCfg.zlevel = seriesModel.getShallow('zlevel') || 0;
        effectCfg.symbolType = symbolType;
        effectCfg.color = color;
        effectCfg.rippleEffectColor = itemModel.get(['rippleEffect', 'color']);

        this.off('mouseover').off('mouseout').off('emphasis').off('normal');

        if (effectCfg.showEffectOn === 'render') {
            this._effectCfg
                ? this.updateEffectAnimation(effectCfg)
                : this.startEffectAnimation(effectCfg);

            this._effectCfg = effectCfg;
        }
        else {
            // Not keep old effect config
            this._effectCfg = null;

            this.stopEffectAnimation();

            (this as ECElement).onHoverStateChange = (toState) => {
                if (toState === 'emphasis') {
                    if (effectCfg.showEffectOn !== 'render') {
                        this.startEffectAnimation(effectCfg);
                    }
                }
                else if (toState === 'normal') {
                    if (effectCfg.showEffectOn !== 'render') {
                        this.stopEffectAnimation();
                    }
                }
            };
        }

        this._effectCfg = effectCfg;

        enableHoverEmphasis(this);
    };

    fadeOut(cb: () => void) {
        this.off('mouseover').off('mouseout');
        cb && cb();
    };

}
zrUtil.inherits(EffectSymbol, Group);

export default EffectSymbol;