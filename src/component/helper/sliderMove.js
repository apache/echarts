define(function (require) {

    /**
     * Calculate slider move result.
     * Usage:
     * (1) If both handle0 and handle1 are needed to be moved, set minSpan the same as
     * maxSpan and the same as `Math.abs(handleEnd[1] - handleEnds[0])`.
     * (2) If handle0 is forbidden to cross handle1, set minSpan as `0`.
     *
     * @param {number} delta Move length.
     * @param {Array.<number>} handleEnds handleEnds[0] can be bigger then handleEnds[1].
     *              handleEnds will be modified in this method.
     * @param {Array.<number>} extent handleEnds is restricted by extent.
     *              extent[0] should less or equals than extent[1].
     * @param {number|string} handleIndex Can be 'all', means that both move the two handleEnds,
     *              where the input minSpan and maxSpan will not work.
     * @param {number} [minSpan] The range of dataZoom can not be smaller than that.
     *              If not set, handle0 and cross handle1. If set as a non-negative
     *              number (including `0`), handles will push each other when reaching
     *              the minSpan.
     * @param {number} [maxSpan] The range of dataZoom can not be larger than that.
     * @return {Array.<number>} The input handleEnds.
     */
    return function (delta, handleEnds, extent, handleIndex, minSpan, maxSpan) {
        // Normalize firstly.
        handleEnds[0] = restrict(handleEnds[0], extent);
        handleEnds[1] = restrict(handleEnds[1], extent);

        delta = delta || 0;

        var extentSpan = extent[1] - extent[0];

        // Notice maxSpan and minSpan can be null/undefined.
        if (minSpan != null) {
            minSpan = restrict(minSpan, [0, extentSpan]);
        }
        if (maxSpan != null) {
            maxSpan = Math.max(maxSpan, minSpan != null ? minSpan : 0);
        }
        if (handleIndex === 'all') {
            minSpan = maxSpan = Math.abs(handleEnds[1] - handleEnds[0]);
            handleIndex = 0;
        }

        var originalDistSign = getSpanSign(handleEnds, handleIndex);

        handleEnds[handleIndex] += delta;

        // Restrict in extent.
        var extentMinSpan = minSpan || 0;
        var realExtent = extent.slice();
        originalDistSign.sign < 0 ? (realExtent[0] += extentMinSpan) : (realExtent[1] -= extentMinSpan);
        handleEnds[handleIndex] = restrict(handleEnds[handleIndex], realExtent);

        // Expand span.
        var currDistSign = getSpanSign(handleEnds, handleIndex);
        if (minSpan != null && (
            currDistSign.sign !== originalDistSign.sign || currDistSign.span < minSpan
        )) {
            // If minSpan exists, 'cross' is forbinden.
            handleEnds[1 - handleIndex] = handleEnds[handleIndex] + originalDistSign.sign * minSpan;
        }

        // Shrink span.
        var currDistSign = getSpanSign(handleEnds, handleIndex);
        if (maxSpan != null && currDistSign.span > maxSpan) {
            handleEnds[1 - handleIndex] = handleEnds[handleIndex] + currDistSign.sign * maxSpan;
        }

        return handleEnds;
    };

    function getSpanSign(handleEnds, handleIndex) {
        var dist = handleEnds[handleIndex] - handleEnds[1 - handleIndex];
        // If `handleEnds[0] === handleEnds[1]`, always believe that handleEnd[0]
        // is at left of handleEnds[1] for non-cross case.
        return {span: Math.abs(dist), sign: dist > 0 ? -1 : dist < 0 ? 1 : handleIndex ? -1 : 1};
    }

    function restrict(value, extend) {
        return Math.min(extend[1], Math.max(extend[0], value));
    }
});