define(function (require) {

    /**
     * Calculate slider move result.
     *
     * @param {number} delta Move length.
     * @param {Array.<number>} handleEnds handleEnds[0] and be bigger then handleEnds[1].
     *                                    handleEnds will be modified in this method.
     * @param {Array.<number>} extent handleEnds is restricted by extent.
     *                                extent[0] should less or equals than extent[1].
     * @param {string} mode 'rigid': Math.abs(handleEnds[0] - handleEnds[1]) remain unchanged,
     *                      'cross' handleEnds[0] can be bigger then handleEnds[1],
     *                      'push' handleEnds[0] can not be bigger then handleEnds[1],
     *                              when they touch, one push other.
     * @param {number} handleIndex If mode is 'rigid', handleIndex is not required.
     * @return {Array.<number>} The input handleEnds.
     */
    return function (delta, handleEnds, extent, mode, handleIndex) {
        if (!delta) {
            return handleEnds;
        }

        if (mode === 'rigid') {
            delta = getRealDelta(delta, handleEnds, extent);
            handleEnds[0] += delta;
            handleEnds[1] += delta;
        }
        else {
            delta = getRealDelta(delta, handleEnds[handleIndex], extent);
            handleEnds[handleIndex] += delta;

            if (mode === 'push' && handleEnds[0] > handleEnds[1]) {
                handleEnds[1 - handleIndex] = handleEnds[handleIndex];
            }
        }

        return handleEnds;

        function getRealDelta(delta, handleEnds, extent) {
            var handleMinMax = !handleEnds.length
                ? [handleEnds, handleEnds]
                : handleEnds.slice();
            handleEnds[0] > handleEnds[1] && handleMinMax.reverse();

            if (delta < 0 && handleMinMax[0] + delta < extent[0]) {
                delta = extent[0] - handleMinMax[0];
            }
            if (delta > 0 && handleMinMax[1] + delta > extent[1]) {
                delta = extent[1] - handleMinMax[1];
            }
            return delta;
        }
    };
});