/**
 * @file TestManager loads and runs test cases
 * @author Wenli Zhang
 */

define(function (require) {

    var factory = require('./testFactory');

    /**
     * test manager
     *
     * @param {number[]} amounts    test case amount array
     * @param {string[]} caseNames test case name array
     */
    function TestManager(amounts, caseNames) {
        this.caseNames = caseNames;
        this.amounts = amounts;

        this.init();
    }

    /**
     * init before running a test
     */
    TestManager.prototype.init = function () {
        this.times = [];
    };

    /**
     * run a test case
     *
     * @param  {number} cid case name id
     * @param  {number} aid amount id
     * @return {Object} case name, case id, amount id, and run time
     */
    TestManager.prototype.run = function (cid, aid) {
        var test = factory.create(this.caseNames[cid], this.amounts[aid]);
        var time = test.runtime();
        if (!this.times[aid]) {
            this.times[aid] = [];
        }
        this.times[aid][cid] = time;

        return {
            caseName: this.caseNames[cid],
            caseId: cid,
            amountId: aid,
            time: time
        };
    };

    /**
     * draw report with ECharts chart
     *
     * @param  {Object} container DOM element to draw on
     */
    TestManager.prototype.drawReport = function (container) {
        var chart = echarts.init(container);
        var that = this;
        chart.setOption({
            series: (function () {
                var series = [];
                for (var cid = 0; cid < that.caseNames.length; ++cid) {
                    var data = [];
                    for (var aid = 0; aid < that.amounts.length; ++aid) {
                        data.push([that.amounts[aid], that.times[aid][cid]]);
                    }
                    series.push({
                        type: 'line',
                        data: data,
                        name: that.caseNames[cid]
                    });
                }
                return series;
            })(),
            xAxis: {
                name: 'Data Amount',
                type: 'log'
            },
            yAxis: {
                name: 'Run Time (milliseconds)',
                type: 'log'
            },
            legend: {
                show: true,
                data: this.caseNames
            },
            tooltip: {
                show: true,
                trigger: 'axis'
            }
        });
    };

    /**
     * get test result in json string
     *
     * @return {string} json string of result
     */
    TestManager.prototype.exportResult = function () {
        var obj = {
            caseNames: this.caseNames,
            amounts: this.amounts,
            times: this.times
        };
        return JSON.stringify(obj, null, '    ');
    };

    return TestManager;

});
