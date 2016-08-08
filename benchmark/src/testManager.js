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

        this.totalAmounts = 0;
        for (var i = 0; i < this.amounts.length; ++i) {
            this.totalAmounts += this.amounts[i];
        }
        this.totalAmounts *= this.caseNames.length;

        this.ranAmounts = 0;
    };

    /**
     * run a test case
     *
     * @param  {number} cid case name id
     * @param  {number} aid amount id
     * @return {Object} case name, case id, amount id, and run time
     */
    TestManager.prototype.run = function (cid, aid) {
        // cancel if last test time of the same caseName is larger than 5
        var test = factory.create(this.caseNames[cid], this.amounts[aid]);

        var time = Math.floor(test.runTime(50));
        if (!this.times[aid]) {
            this.times[aid] = [];
        }
        this.times[aid][cid] = time;

        this.ranAmounts += this.amounts[aid];

        return {
            caseName: this.caseNames[cid],
            caseId: cid,
            amountId: aid,
            time: time
        };
    };

    /**
     * get current progress
     *
     * @return {number} progress from 0 to 1
     */
    TestManager.prototype.getProgress = function () {
        return this.ranAmounts / this.totalAmounts;
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
                // type: 'log',
                axisLabel: {
                    formatter: function (v) {
                        return Math.floor(v);
                    }
                }
            },
            yAxis: {
                name: 'Run Time (milliseconds)',
                // type: 'log',
                axisLabel: {
                    formatter: function (v) {
                        return Math.floor(v);
                    }
                }
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
