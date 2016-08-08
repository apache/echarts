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
