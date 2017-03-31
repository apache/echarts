/**
 * For testable.
 */
define(function (require) {

    var numberUtil = require('../util/number');

    var roundNumber = numberUtil.round;

    var helper = {};

    /**
     * @param {Array.<number>} extent Both extent[0] and extent[1] should be valid number.
     *                                Should be extent[0] < extent[1].
     * @param {number} splitNumber splitNumber should be >= 1.
     * @return {Object} {interval, intervalPrecision, niceTickExtent}
     */
    helper.intervalScaleNiceTicks = function (extent, splitNumber) {
        var result = {};
        var span = extent[1] - extent[0];

        var interval = result.interval = numberUtil.nice(span / splitNumber, true);
        // Tow more digital for tick.
        var precision = result.intervalPrecision = numberUtil.getPrecisionSafe(interval) + 2;
        // Niced extent inside original extent
        var niceTickExtent = result.niceTickExtent = [
            roundNumber(Math.ceil(extent[0] / interval) * interval, precision),
            roundNumber(Math.floor(extent[1] / interval) * interval, precision)
        ];

        // In some cases (e.g., splitNumber is 1), niceTickExtent may be out of extent.
        !isFinite(niceTickExtent[0]) && (niceTickExtent[0] = extent[0]);
        !isFinite(niceTickExtent[1]) && (niceTickExtent[1] = extent[1]);
        clamp(niceTickExtent, 0, extent);
        clamp(niceTickExtent, 1, extent);
        if (niceTickExtent[0] > niceTickExtent[1]) {
            niceTickExtent[0] = niceTickExtent[1];
        }

        return result;
    };

    function clamp(niceTickExtent, idx, extent) {
        niceTickExtent[idx] = Math.max(Math.min(niceTickExtent[idx], extent[1]), extent[0]);
    }

    helper.intervalScaleGetTicks = function (interval, extent, niceTickExtent, intervalPrecision) {
        var ticks = [];

        // If interval is 0, return [];
        if (!interval) {
            return ticks;
        }

        // Consider this case: using dataZoom toolbox, zoom and zoom.
        var safeLimit = 10000;

        if (extent[0] < niceTickExtent[0]) {
            ticks.push(extent[0]);
        }
        var tick = niceTickExtent[0];

        while (tick <= niceTickExtent[1]) {
            ticks.push(tick);
            // Avoid rounding error
            tick = roundNumber(tick + interval, intervalPrecision);
            if (tick === ticks[ticks.length - 1]) {
                // Consider out of safe float point, e.g.,
                // -3711126.9907707 + 2e-10 === -3711126.9907707
                break;
            }
            if (ticks.length > safeLimit) {
                return [];
            }
        }
        // Consider this case: the last item of ticks is smaller
        // than niceTickExtent[1] and niceTickExtent[1] === extent[1].
        if (extent[1] > (ticks.length ? ticks[ticks.length - 1] : niceTickExtent[1])) {
            ticks.push(extent[1]);
        }

        return ticks;
    };

    return helper;
});