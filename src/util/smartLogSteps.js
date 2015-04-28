/**
 * Echarts, logarithmic axis reform
 *
 * @author sushuang (sushuang@baidu.com),
 *         Ievgenii (@Ievgeny, ievgeny@zoomdata.com)
 */

define(function(require) {

    // Reference
    var zrUtil = require('zrender/tool/util');
    var Mt = Math;
    var mathLog = Mt.log;
    var mathPow = Mt.pow;
    var mathAbs = Mt.abs;
    var mathCeil = Mt.ceil;
    var mathFloor = Mt.floor;

    // Constant
    var LOG_BASE = Mt.E; // It is not necessary to specify log base,
                         // because log(logBase, x) = ln(x) / ln(logBase),
                         // thus final result (axis tick location) is only determined by ln(x).
    var LN10 = Mt.LN10;
    var LN2 = Mt.LN2;
    var LN2D10 = LN2 / LN10;
    var EPSILON = 1e-9;
    var DEFAULT_SPLIT_NUMBER = 5;
    var MIN_BASE_10_SPLIT_NUMBER = 2;

    // Static variable
    var logPositive;
    var custOpts;
    var splitNumber;
    var logMappingOffset;
    var absMin;
    var absMax;
    var outputMethods;
    var tickList;

    /**
     * Test cases:
     * [2, 4, 8, 16, 32, 64, 128]
     * [2, 4, 8, 16, '-', 64, 128]
     * [2, 4, 8, 16, 32, 64]
     * [2, 4, 8, 16, 32]
     * [0.00000256, 0.0016, 0.04, 0.2]
     * [0.1, 1, 10, 100, 1000, 10000, 100000, 1000000] splitNumber: 3
     * [1331, 3434, 500, 1, 1212, 4]
     * [0.14, 2, 45, 1001, 200, 0.33, 10001]
     * [0.00001, 0.00005]
     * [0.00001, 0.00005] boundaryGap: [0.2, 0.4]
     * [0.001, 2, -45, 1001, 200, 0.33, 10000]
     * [0.00000001, 0.00000012]
     * [0.000000000000001]
     * [0.00000001, 0.00000001]
     * [3, 3]
     * [12, -3, 47, 19]
     * [12, -3, 47, 19] logPositive: false
     * [-2, -4, -8, -16, -32, -64, -128]
     * [-2, -4, -8, -16, -32, -64]
     * [2, 4, 8, 16, 32] boundaryGap: [0.2, 0.4]
     * []
     * [0]
     * [10, 10, 10]
     * [0.00003, 0.00003, 0.00003]
     * [0.00001, 0.00001, 0.00001]
     * [-0.00001, -0.00001, -0.00001]
     * ['-', '-']
     * ['-', 10]
     */

    /**
     * Main function. Return data object with values for axis building.
     *
     * @public
     * @param {Object} [opts] Configurable options
     * @param {number} opts.dataMin data Minimum
     * @param {number} opts.dataMax data Maximum
     * @param {number=} opts.logPositive Logarithmic sign. If not specified, it will be auto-detected.
     * @param {number=} opts.splitNumber Number of sections perfered.
     * @return {Object} {
     *                      dataMin: New min,
     *                      dataMax: New max,
     *                      tickList: [Array of tick data]
     *                      logPositive: Type of data sign
     *                      methods: [Set of logarithmic methods]
     *                  }
     */
    function smartLogSteps(opts) {
        clearStaticVariables();
        custOpts = opts || {};

        reformSetting();
        makeTicksList();

        outputMethods = zrUtil.merge({}, makeOutputMethods(logPositive, logMappingOffset));

        return [
            makeResult(),
            clearStaticVariables()
        ][0];
    }

    /**
     * All of static variables must be clear here.
     */
    function clearStaticVariables() {
        outputMethods = logPositive = custOpts = logMappingOffset =
        absMin = absMax = splitNumber = tickList = null;
    }

    /**
     * Determine sign (logPositive, negative) of data set, if not specified.
     * Reform min and max of data.
     */
    function reformSetting() {
        splitNumber = custOpts.splitNumber;
        splitNumber == null && (splitNumber = DEFAULT_SPLIT_NUMBER);

        var dataMin = parseFloat(custOpts.dataMin);
        var dataMax = parseFloat(custOpts.dataMax);

        if (!isFinite(dataMin) && !isFinite(dataMax)) {
            dataMin = dataMax = 1;
        }
        else if (!isFinite(dataMin)) {
            dataMin = dataMax;
        }
        else if (!isFinite(dataMax)) {
            dataMax = dataMin;
        }
        else if (dataMin > dataMax) {
            dataMax = [dataMin, dataMin = dataMax][0]; // Exchange min, max.
        }

        logPositive = custOpts.logPositive;
        // If not specified, determine sign by data.
        if (logPositive == null) {
            // LogPositive is false when dataMax <= 0 && dataMin < 0.
            // LogPositive is true when dataMin >= 0.
            // LogPositive is true when dataMax >= 0 && dataMin < 0 (singular points may exists)
            logPositive = dataMax > 0 || dataMin === 0;
        }

        // Set absMin and absMax, which must be greater than 0.
        absMin = logPositive ? dataMin : -dataMax;
        absMax = logPositive ? dataMax : -dataMin;
        // FIXME
        // If there is any data item less then zero, it is suppose to be igonred and min should be re-calculated.
        // But it is difficult to do that in current code stucture.
        // So refactor of xxAxis.js is desired.
        absMin < EPSILON && (absMin = EPSILON);
        absMax < EPSILON && (absMax = EPSILON);
    }

    /**
     * Make tick list.
     */
    function makeTicksList() {
        tickList = [];

        // Estimate max exponent and min exponent
        var maxDataLog10 = fixAccurate(mathLog(absMax) / LN10);
        var minDataLog10 = fixAccurate(mathLog(absMin) / LN10);
        var maxExpon10 = mathCeil(maxDataLog10);
        var minExpon10 = mathFloor(minDataLog10);
        var spanExpon10 = maxExpon10 - minExpon10;
        var spanDataLog10 = maxDataLog10 - minDataLog10;

        !(
            spanExpon10 <= MIN_BASE_10_SPLIT_NUMBER
            && splitNumber > MIN_BASE_10_SPLIT_NUMBER
        )
            ? base10Analysis() : detailAnalysis();


        // In this situation, only plot base-10 ticks.
        // Base-10 ticks: 10^h (i.e. 0.01, 0.1, 1, 10, 100, ...)
        function base10Analysis() {
            if (spanExpon10 < splitNumber) {
                splitNumber = spanExpon10;
            }
            // Suppose:
            //      spanExpon10 > splitNumber
            //      stepExpon10 := floor(spanExpon10 / splitNumber)
            //      splitNumberFloat := spanExpon10 / stepExpon10
            // There are tow expressions which are identically-true:
            //      splitNumberFloat - splitNumber <= 1
            //      stepExpon10 * ceil(splitNumberFloat) - spanExpon10 <= stepExpon10
            // So we can calculate as follows:
            var stepExpon10 = mathFloor(fixAccurate(spanExpon10 / splitNumber));

            // Put the plot in the middle of the min, max.
            var splitNumberAdjust = mathCeil(fixAccurate(spanExpon10 / stepExpon10));
            var spanExpon10Adjust = stepExpon10 * splitNumberAdjust;
            var halfDiff10 = (spanExpon10Adjust - spanDataLog10) / 2;
            var minExpon10Adjust = mathFloor(fixAccurate(minDataLog10 - halfDiff10));

            // Build logMapping offset
            logMappingOffset = -minExpon10Adjust * LN10;

            // Build tickList
            for (var n = minExpon10Adjust; n - stepExpon10 < maxDataLog10; n += stepExpon10) {
                tickList.push(mathPow(10, n));
            }
        }

        // In this situation, base-2|10 ticks are used to make detailed split.
        // Base-2|10 ticks: 10^h * 2^k (i.e. 0.1, 0.2, 0.4, 0.8, 1, 2, 4, 8, 10, 20, 40, 80),
        // where k in [0, 1, 2].
        // Because LN2 * 3 < LN10 and LN2 * 4 > LN10, k should be less than 3.
        // And when k === 3, the tick is too close to that of k === 0, which looks weird. So we dont use 3.
        function detailAnalysis() {
            // Find max exponent and min exponent.
            // Calculate base on 3-hexadecimal (0, 1, 2, 10, 11, 12, 20).
            var minDecimal = toDecimalFrom4Hex(minExpon10, 0);
            var endDecimal = minDecimal + 2;
            while (
                minDecimal < endDecimal
                && toH(minDecimal + 1) + toK(minDecimal + 1) * LN2D10 < minDataLog10
            ) {
                minDecimal++;
            }
            var maxDecimal = toDecimalFrom4Hex(maxExpon10, 0);
            var endDecimal = maxDecimal - 2; // maxDecimal is greater than 4
            while (
                maxDecimal > endDecimal
                && toH(maxDecimal - 1) + toK(maxDecimal - 1) * LN2D10 > maxDataLog10
            ) {
                maxDecimal--;
            }

            // Build logMapping offset
            logMappingOffset = -(toH(minDecimal) * LN10 + toK(minDecimal) * LN2);

            // Build logMapping tickList
            for (var i = minDecimal; i <= maxDecimal; i++) {
                var h = toH(i);
                var k = toK(i);
                tickList.push(mathPow(10, h) * mathPow(2, k));
                // FIXME
                // 小数的显示
            }
        }

        // Convert to decimal number from 4-hexadecimal number,
        // where h, k means: if there is a 4-hexadecimal numer 23, then h is 2, k is 3.
        // h can be any integer (notice: h can be greater than 10 or less than 0),
        // and k belongs to [0, 1, 2, 3].
        function toDecimalFrom4Hex(h, k) {
            return h * 3 + k;
        }

        function toK(decimal) {
            return decimal - toH(decimal) * 3; // Can not calculate by '%'
        }

        function toH(decimal) {
            return mathFloor(fixAccurate(decimal / 3));
        }
    }

    /**
     * Make result
     */
    function makeResult() {
        var resultTickList = [];
        for (var i = 0, len = tickList.length; i < len; i++) {
            resultTickList[i] = formatNumber((logPositive ? 1 : -1) * tickList[i]);
        }
        !logPositive && resultTickList.reverse();

        var logMapping = outputMethods.logMapping;
        var newDataMin = logMapping(resultTickList[0]);
        var newDataMax = logMapping(resultTickList[resultTickList.length - 1]);

        if (newDataMin === newDataMax) {
            newDataMin -= 1;
            newDataMax += 1;
        }

        return {
            // FIXME
            // tickList.length 为0的情况
            dataMin: newDataMin,
            dataMax: newDataMax,
            tickList: resultTickList,
            logPositive: logPositive,
            methods: zrUtil.merge({}, outputMethods)
        };
    }

    /**
     * Make calculate methods.
     * logPositive and logMappingOffset should be fixed in the scope of the methods.
     */
    function makeOutputMethods(logPositive, logMappingOffset) {
        return {
            logMapping: function (x) {
                if (x == null || isNaN(x) || !isFinite(x)) {
                    return x;
                }
                x = parseFloat(x); // to number
                if (!isFinite(x)) {
                    x = EPSILON;
                }
                else if (logPositive && x < EPSILON) {
                    // FIXME
                    // It is suppose to be ignore, but not be set to EPSILON. See comments above.
                    x = EPSILON;
                }
                else if (!logPositive && x > -EPSILON) {
                    x = -EPSILON;
                }
                x = mathAbs(x);
                return (logPositive ? 1 : -1) * (mathLog(x) + logMappingOffset);
            },
            powMapping: function (x) {
                if (x == null || isNaN(x) || !isFinite(x)) {
                    return x;
                }
                x = parseFloat(x); // to number
                if (!isFinite(x)) {
                    x = EPSILON;
                }
                return logPositive
                    ? mathPow(LOG_BASE, x - logMappingOffset)
                    : -mathPow(LOG_BASE, -x + logMappingOffset);
            }
        };
    }

    /**
     * For example, Math.log(1000) / Math.LN10 get the result of 2.9999999999999996, rather than 3.
     * This method trys to fix it.
     * (accMath.div can not fix this problem yet.)
     */
    function fixAccurate(result) {
        return +Number(+result).toFixed(14);
    }

    /**
     * Avoid show float number like '1e-9', '-1e-10', ...
     * @return {string}
     */
    function formatNumber(num) {
        // FIXME
        // I think we should not do this here, but in valueAxis.js
        // So refector is desired.
        return Number(num).toFixed(15).replace(/\.?0*$/, '');
    }

    return smartLogSteps;
});
