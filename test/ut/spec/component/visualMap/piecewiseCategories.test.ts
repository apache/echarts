
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

import { createChart, getECModel } from '../../../core/utHelper';
import { EChartsType } from '../../../../../src/echarts';
import PiecewiseModel from '../../../../../src/component/visualMap/PiecewiseModel';


describe('visualMap_piecewiseCategories', function () {
    let chart: EChartsType;
    beforeEach(function () {
        chart = createChart();
    });

    afterEach(function () {
        chart.dispose();
    });

    // See https://github.com/apache/echarts/issues/21236
    function setOptionWithCategoryAxisDimension() {
        chart.setOption({
            animation: false,
            dataset: {
                source: [
                    ['age', 'profession'],
                    [30, 'teacher'],
                    [40, 'doctor'],
                    [50, 'teacher']
                ]
            },
            xAxis: {type: 'value'},
            yAxis: {type: 'category'},
            visualMap: {
                type: 'piecewise',
                dimension: 'profession',
                categories: ['teacher', 'doctor'],
                inRange: {
                    symbol: ['diamond', 'circle']
                }
            },
            series: [{type: 'scatter', encode: {x: 'age', y: 'profession'}}]
        });
    }

    it('should map categories on a dimension encoded to a category axis', function () {
        setOptionWithCategoryAxisDimension();
        const data = getECModel(chart).getSeriesByIndex(0).getData();

        expect([0, 1, 2].map(idx => data.getItemVisual(idx, 'symbol'))).toEqual(['diamond', 'circle', 'diamond']);
    });

    it('should find target data of a category on a dimension encoded to a category axis', function () {
        setOptionWithCategoryAxisDimension();
        const visualMapModel = getECModel(chart).getComponent('visualMap') as PiecewiseModel;
        const seriesId = getECModel(chart).getSeriesByIndex(0).id;

        const pieceIndexOf = (value: string) => visualMapModel.getPieceList().findIndex(piece => piece.value === value);

        expect(visualMapModel.findTargetDataIndices(pieceIndexOf('teacher'))).toEqual([{seriesId, dataIndex: [0, 2]}]);
        expect(visualMapModel.findTargetDataIndices(pieceIndexOf('doctor'))).toEqual([{seriesId, dataIndex: [1]}]);
    });

});
