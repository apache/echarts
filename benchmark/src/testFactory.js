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
 * @file TestFactory creates test cases based on names and options
 * @author Wenli Zhang
 */

define(function (require) {

    var TestCase = require('./testCase');

    var TestFactory = {};

    /**
     * create test case, return instance of TestCase
     *
     * @param  {string}   name   name of test case
     * @param  {number}   amount data amount
     * @return {TestCase}        test case instance
     */
    TestFactory.create = function (name, amount) {
        var option = null;
        switch (name) {
            case 'line':
            case 'line sampling':
            case 'bar':
            case 'scatter':
                option = {
                    series: {
                        data: data2D(amount),
                        type: name
                    },
                    xAxis: {
                        type: 'value'
                    },
                    yAxis: {
                        type: 'value'
                    }
                };
                break;

            case 'pie':
                option = {
                    series: {
                        data: data1D(amount),
                        type: 'pie'
                    }
                };
                break;

            default:
                console.error('Test name ' + name + ' not found!');
                return null;
        }

        if (name === 'line sampling') {
            option.series.sampling = 'max';
            option.series.type = 'line';
        }

        option.animation = false;
        return new TestCase(name, option);
    };

    /**
     * generate random 1d data
     *
     * @param  {number}   amount data amount
     * @return {number[]}        generated random data
     */
    function data1D(amount) {
        var result = [];
        for (var i = 0; i < amount; ++i) {
            result.push(Math.random());
        }
        return result;
    }

    /**
     * generate random 2d data
     *
     * @param  {number}   amount data amount
     * @return {number[]}        generated random data
     */
    function data2D(amount) {
        var result = [];
        for (var i = 0; i < amount; ++i) {
            result.push([Math.random(), Math.random()]);
        }
        return result;
    }

    return TestFactory;

});
