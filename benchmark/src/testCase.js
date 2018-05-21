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

/**
 * @file TestCase is the class for each test case of EChart
 * @author Wenli Zhang
 */

define(function (require) {

    /**
     * set up test case
     *
     * @param {string} name   name of test case
     * @param {Object} option ECharts option
     */
    function TestCase(name, option) {

        this.name = name;
        this.option = option;

    }

    /**
     * run test case and return elapsed time
     *
     * @param  {iterations} iterations number of iterations
     * @return {number}                elapsed time
     */
    TestCase.prototype.runTime = function (iterations) {
        // run for multi times
        var total = 0;
        for (var i = 0; i < iterations; ++i) {
            total += runTime(this.option);
        }
        return total / iterations;
    };

    function runTime(option) {
        var container = document.createElement('div');
        container.style.width = '800px';
        container.style.height = '600px';

        var start = new Date();

        var chart = echarts.init(container);
        chart.setOption(option);

        var end = new Date();

        chart.dispose();

        return end - start;
    }

    return TestCase;

});
