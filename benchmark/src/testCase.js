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
     * @return {number} elapsed time
     */
    TestCase.prototype.runtime = function () {

        var container = document.createElement('div');
        container.style.width = '800px';
        container.style.height = '600px';

        var start = new Date();

        var chart = echarts.init(container);
        chart.setOption(this.option);

        var end = new Date();

        chart.dispose();

        return end - start;

    };

    return TestCase;

});
