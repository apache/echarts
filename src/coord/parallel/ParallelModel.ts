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
import ComponentModel from '../../model/Component';
import Parallel from './Parallel';
import { DimensionName, ComponentOption, BoxLayoutOptionMixin } from '../../util/types';
import ParallelAxisModel, { ParallelAxisOption } from './AxisModel';
import GlobalModel from '../../model/Global';
import ParallelSeriesModel from '../../chart/parallel/ParallelSeries';
import SeriesModel from '../../model/Series';


export type ParallelLayoutDirection = 'horizontal' | 'vertical';

export interface ParallelCoordinateSystemOption extends ComponentOption, BoxLayoutOptionMixin {
    mainType?: 'parallel';

    layout?: ParallelLayoutDirection;

    axisExpandable?: boolean;
    axisExpandCenter?: number;
    axisExpandCount?: number;
    axisExpandWidth?: number; // TODO '10%' ?
    axisExpandTriggerOn?: 'click' | 'mousemove';

    // Not ready to expose to users yet.
    axisExpandRate?: number;
    // Not ready to expose to users yet.
    axisExpandDebounce?: number;
    // Not ready to expose to users yet.
    // [out, in, jumpTarget]. In percentage. If use [null, 0.05], null means full.
    // Do not doc to user until necessary.
    axisExpandSlideTriggerArea?: [number, number, number];
    // Not ready to expose to users yet.
    axisExpandWindow?: number[];

    parallelAxisDefault?: ParallelAxisOption
}

class ParallelModel extends ComponentModel<ParallelCoordinateSystemOption> {

    static type = 'parallel';
    readonly type = ParallelModel.type;

    static dependencies = ['parallelAxis'];

    coordinateSystem: Parallel;

    /**
     * Each item like: 'dim0', 'dim1', 'dim2', ...
     */
    dimensions: DimensionName[];

    /**
     * Coresponding to dimensions.
     */
    parallelAxisIndex: number[];

    static layoutMode = 'box' as const;

    static defaultOption: ParallelCoordinateSystemOption = {
        zlevel: 0,
        z: 0,
        left: 80,
        top: 60,
        right: 80,
        bottom: 60,
        // width: {totalWidth} - left - right,
        // height: {totalHeight} - top - bottom,

        layout: 'horizontal',      // 'horizontal' or 'vertical'

        // FIXME
        // naming?
        axisExpandable: false,
        axisExpandCenter: null,
        axisExpandCount: 0,
        axisExpandWidth: 50,      // FIXME '10%' ?
        axisExpandRate: 17,
        axisExpandDebounce: 50,
        // [out, in, jumpTarget]. In percentage. If use [null, 0.05], null means full.
        // Do not doc to user until necessary.
        axisExpandSlideTriggerArea: [-0.15, 0.05, 0.4],
        axisExpandTriggerOn: 'click', // 'mousemove' or 'click'

        parallelAxisDefault: null
    };

    init() {
        super.init.apply(this, arguments as any);
        this.mergeOption({});
    }

    mergeOption(newOption: ParallelCoordinateSystemOption) {
        const thisOption = this.option;

        newOption && zrUtil.merge(thisOption, newOption, true);

        this._initDimensions();
    }

    /**
     * Whether series or axis is in this coordinate system.
     */
    contains(model: SeriesModel | ParallelAxisModel, ecModel: GlobalModel): boolean {
        const parallelIndex = (model as ParallelSeriesModel).get('parallelIndex');
        return parallelIndex != null
            && ecModel.getComponent('parallel', parallelIndex) === this;
    }

    setAxisExpand(opt: {
        axisExpandable?: boolean,
        axisExpandCenter?: number,
        axisExpandCount?: number,
        axisExpandWidth?: number,
        axisExpandWindow?: number[]
    }): void {
        zrUtil.each(
            [
                'axisExpandable',
                'axisExpandCenter',
                'axisExpandCount',
                'axisExpandWidth',
                'axisExpandWindow'
            ] as const,
            function (name) {
                if (opt.hasOwnProperty(name)) {
                    // @ts-ignore FIXME: why "never" inferred in this.option[name]?
                    this.option[name] = opt[name];
                }
            },
            this
        );
    }

    private _initDimensions(): void {
        const dimensions = this.dimensions = [] as DimensionName[];
        const parallelAxisIndex = this.parallelAxisIndex = [] as number[];

        const axisModels = zrUtil.filter(
            this.ecModel.queryComponents({ mainType: 'parallelAxis' }),
            function (axisModel: ParallelAxisModel) {
                // Can not use this.contains here, because
                // initialization has not been completed yet.
                return (axisModel.get('parallelIndex') || 0) === this.componentIndex;
            },
            this
        );

        zrUtil.each(axisModels, function (axisModel: ParallelAxisModel) {
            dimensions.push('dim' + axisModel.get('dim'));
            parallelAxisIndex.push(axisModel.componentIndex);
        });
    }

}

export default ParallelModel;
