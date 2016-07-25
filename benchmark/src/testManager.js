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
        this.caseId = 0;
        this.amountId = 0;
        this.hasNext = true;
    };

    /**
     * run next test case
     *
     * @return {Object} case name, case id, amount id, and run time
     */
    TestManager.prototype.next = function () {
        var lastAmountId = this.amountId;
        var lastCaseId = this.caseId;

        var test = factory.create(this.caseNames[this.caseId],
            this.amounts[this.amountId]);
        ++this.caseId;
        if (this.caseId >= this.caseNames.length) {
            // last case for certain amount
            ++this.amountId;
            this.caseId = 0;
            if (this.amountId >= this.amounts.length) {
                // last case for all
                this.hasNext = false;
            }
        }
        var time = test.runtime();
        if (!this.times[lastAmountId]) {
            this.times[lastAmountId] = [];
        }
        this.times[lastAmountId][lastCaseId] = time;

        return {
            caseName: this.caseNames[lastCaseId],
            caseId: lastCaseId,
            amountId: lastAmountId,
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
                type: 'value'
            },
            yAxis: {
                name: 'Run Time (milliseconds)',
                type: 'value'
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

    return TestManager;

});
