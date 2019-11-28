
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
const helper = require('../../../../../lib/component/dataZoom/helper');
const utHelper = require('../../../core/utHelper');
describe('dataZoom/helper', function () {

    function makeRecords(result) {
        var o = {};
        helper.eachAxisDim(function (dimNames) {
            o[dimNames.name] = {};
            var r = result[dimNames.name] || [];
            for (var i = 0; i < r.length; i++) {
                o[dimNames.name][r[i]] = true;
            }
        });
        return o;
    }

    describe('findLinkedNodes', function () {

        function forEachModel(models, callback) {
            for (var i = 0; i < models.length; i++) {
                callback(models[i]);
            }
        }

        function axisIndicesGetter(model, dimNames) {
            return model[dimNames.axisIndex];
        }

        it('findLinkedNodes_base', function (done) {
            var models = [
                {xAxisIndex: [1, 2], yAxisIndex: [0]},
                {xAxisIndex: [3], yAxisIndex: [1]},
                {xAxisIndex: [5], yAxisIndex: []},
                {xAxisIndex: [2, 5], yAxisIndex: []}
            ];
            var result = helper.createLinkedNodesFinder(
                utHelper.curry(forEachModel, models),
                helper.eachAxisDim,
                axisIndicesGetter
            )(models[0]);
            expect(result).toEqual({
                nodes: [models[0], models[3], models[2]],
                records: makeRecords({x: [1, 2, 5], y: [0]})
            });
            done();
        });

        it('findLinkedNodes_crossXY', function (done) {
            var models = [
                {xAxisIndex: [1, 2], yAxisIndex: [0]},
                {xAxisIndex: [3], yAxisIndex: [3, 0]},
                {xAxisIndex: [6, 3], yAxisIndex: [9]},
                {xAxisIndex: [5, 3], yAxisIndex: []},
                {xAxisIndex: [8], yAxisIndex: [4]}
            ];
            var result = helper.createLinkedNodesFinder(
                utHelper.curry(forEachModel, models),
                helper.eachAxisDim,
                axisIndicesGetter
            )(models[0]);
            expect(result).toEqual({
                nodes: [models[0], models[1], models[2], models[3]],
                records: makeRecords({x: [1, 2, 3, 5, 6], y: [0, 3, 9]})
            });
            done();
        });

        it('findLinkedNodes_emptySourceModel', function (done) {
            var models = [
                {xAxisIndex: [1, 2], yAxisIndex: [0]},
                {xAxisIndex: [3], yAxisIndex: [3, 0]},
                {xAxisIndex: [6, 3], yAxisIndex: [9]},
                {xAxisIndex: [5, 3], yAxisIndex: []},
                {xAxisIndex: [8], yAxisIndex: [4]}
            ];
            var result = helper.createLinkedNodesFinder(
                utHelper.curry(forEachModel, models),
                helper.eachAxisDim,
                axisIndicesGetter
            )();
            expect(result).toEqual({
                nodes: [],
                records: makeRecords({x: [], y: []})
            });
            done();
        });

    });

});