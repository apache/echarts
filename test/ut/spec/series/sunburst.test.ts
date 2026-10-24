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

import { EChartsType } from '@/src/echarts';
import type { DecalObject } from '@/src/util/types';
import { createChart, getECModel } from '../../core/utHelper';


describe('sunburst', function () {
    let chart: EChartsType;

    beforeEach(function () {
        chart = createChart({
            opts: {
                renderer: 'svg'
            }
        });
    });

    afterEach(function () {
        chart.dispose();
    });

    it('should preserve itemStyle decal overrides when aria decal is enabled', function () {
        chart.setOption({
            aria: {
                enabled: true,
                decal: {
                    show: true,
                    decals: {
                        symbol: 'circle'
                    }
                }
            },
            series: {
                type: 'sunburst',
                data: [
                    {
                        name: 'Parent',
                        children: [
                            {
                                name: 'Base decal',
                                value: 1
                            },
                            {
                                name: 'Changed decal',
                                value: 1,
                                itemStyle: {
                                    decal: {
                                        symbol: 'none'
                                    }
                                }
                            },
                            {
                                name: 'Disabled decal',
                                value: 1,
                                itemStyle: {
                                    decal: 'none'
                                }
                            }
                        ]
                    }
                ]
            }
        });

        const data = getECModel(chart).getSeries()[0].getData();
        const baseIdx = data.indexOfName('Base decal');
        const changedIdx = data.indexOfName('Changed decal');
        const disabledIdx = data.indexOfName('Disabled decal');

        expect(baseIdx).not.toBe(-1);
        expect(changedIdx).not.toBe(-1);
        expect(disabledIdx).not.toBe(-1);

        const baseDecal = data.getItemVisual(baseIdx, 'decal') as DecalObject;
        const changedDecal = data.getItemVisual(changedIdx, 'decal') as DecalObject;

        expect(baseDecal.symbol).toBe('circle');
        expect(changedDecal.symbol).toBe('none');
        expect(data.getItemVisual(disabledIdx, 'decal')).toBe('none');
        expect(data.getItemVisual(disabledIdx, 'style').decal).toBeNull();
    });
});
