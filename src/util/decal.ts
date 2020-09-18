import {DecalObject, DecalDashArrayX, DecalDashArrayY} from 'zrender/src/graphic/Decal';
import Pattern, {PatternObject} from 'zrender/src/graphic/Pattern';
import {defaults, createCanvas, map} from 'zrender/src/core/util';
import {getLeastCommonMultiple} from './number';

/**
 * Create or update pattern image from decal options
 *
 * @param {DecalObject} decalObject decal options
 * @return {Pattern} pattern with generated image
 */
export function createOrUpdatePatternFromDecal(
    decalObject: DecalObject
): PatternObject {
    if (decalObject.__pattern) {
        return decalObject.__pattern;
    }

    const decalOpt = defaults({
        shape: 'rect',
        symbolSize: 1,
        symbolKeepAspect: true,
        color: 'rgba(255, 255, 255, 0.4)',
        backgroundColor: null,
        dashArrayX: 10,
        dashArrayY: 10,
        dashLineOffset: 0,
        rotation: Math.PI / 4,
        maxTileWidth: 512,
        maxTileHeight: 512
    } as DecalObject, decalObject);
    if (decalOpt.backgroundColor === 'none') {
        decalOpt.backgroundColor = null;
    }

    const dashArrayX = normalizeDashArrayX(decalOpt.dashArrayX);
    const dashArrayY = normalizeDashArrayY(decalOpt.dashArrayY);

    const lineBlockLengthsX = getLineBlockLengthX(dashArrayX);
    const lineBlockLengthY = getLineBlockLengthY(dashArrayY);

    const canvas = createCanvas();
    const pSize = getPatternSize();

    canvas.width = pSize.width;
    canvas.height = pSize.height;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    const ctx = canvas.getContext('2d');

    brush();

    const base64 = canvas.toDataURL();

    const pattern = new Pattern(base64, 'repeat', decalOpt.rotation);
    decalObject.__pattern = pattern;

    decalObject.dirty = function () {
        console.log('dirty');
    };

    return pattern;

    /**
     * Get minumum length that can make a repeatable pattern.
     *
     * @return {Object} pattern width and height
     */
    function getPatternSize()
        : {
            width: number,
            height: number,
            lines: number
        }
    {
        /**
         * For example, if dash is [[3, 2], [2, 1]] for X, it looks like
         * |---  ---  ---  ---  --- ...
         * |-- -- -- -- -- -- -- -- ...
         * |---  ---  ---  ---  --- ...
         * |-- -- -- -- -- -- -- -- ...
         * So the minumum length of X is 15,
         * which is the least common multiple of `3 + 2` and `2 + 1`
         * |---  ---  ---  |---  --- ...
         * |-- -- -- -- -- |-- -- -- ...
         *
         * When consider with dashLineOffset, it means the `n`th line has the offset
         * of `n * dashLineOffset`.
         * For example, if dash is [[3, 1], [1, 1]] and dashLineOffset is 3,
         * and use `=` for the start to make it clear, it looks like
         * |=-- --- --- --- --- -...
         * | - = - - - - - - - - ...
         * |- --- =-- --- --- -- ...
         * | - - - - = - - - - - ...
         * |--- --- --- =-- --- -...
         * | - - - - - - - = - - ...
         * In this case, the minumum length is 12, which is the least common
         * multiple of `3 + 1`, `1 + 1` and `3 * 2` where `2` is xlen
         * |=-- --- --- |--- --- -...
         * | - = - - - -| - - - - ...
         * |- --- =-- --|- --- -- ...
         * | - - - - = -| - - - - ...
         */
        const offsetMultipleX = decalOpt.dashLineOffset || 1;
        let width = 1;
        for (let i = 0, xlen = lineBlockLengthsX.length; i < xlen; ++i) {
            const x = getLeastCommonMultiple(offsetMultipleX * xlen, lineBlockLengthsX[i]);
            width = getLeastCommonMultiple(width, x);
        }
        const columns = decalOpt.dashLineOffset
            ? width / offsetMultipleX
            : 2;
        let height = lineBlockLengthY * columns;

        return {
            width: Math.max(1, Math.min(width, decalOpt.maxTileWidth)),
            height: Math.max(1, Math.min(height, decalOpt.maxTileHeight)),
            lines: columns
        };
    }

    function fixStartPosition(lineOffset: number, blockLength: number) {
        let start = lineOffset || 0;
        while (start > 0) {
            start -= blockLength;
        }
        return start;
    }

    function brush() {
        ctx.clearRect(0, 0, pSize.width, pSize.height);
        if (decalOpt.backgroundColor) {
            ctx.fillStyle = decalOpt.backgroundColor;
            ctx.fillRect(0, 0, pSize.width, pSize.height);
        }

        ctx.fillStyle = decalOpt.color;

        let yCnt = 0;
        let y = -pSize.lines * lineBlockLengthY;
        let yId = 0;
        let xId0 = 0;
        while (y < pSize.height) {
            if (yId % 2 === 0) {
                let x = fixStartPosition(
                    decalOpt.dashLineOffset * (yCnt - pSize.lines) / 2,
                    lineBlockLengthsX[0]
                );
                let xId1 = 0;
                while (x < pSize.width * 2) {
                    if (xId1 % 2 === 0) {
                        // E.g., [15, 5, 20, 5] draws only for 15 and 20
                        // brushShape(x, y, dashArrayX[xId0][xId1], dashArrayY[yId]);
                        ctx.fillRect(x, y, dashArrayX[xId0][xId1], dashArrayY[yId]);
                    }

                    x += dashArrayX[xId0][xId1];
                    ++xId1;
                    if (xId1 === dashArrayX[xId0].length) {
                        xId1 = 0;
                    }
                }

                ++xId0;
                if (xId0 === dashArrayX.length) {
                    xId0 = 0;
                }
            }

            ++yCnt;
            y += dashArrayY[yId];

            ++yId;
            if (yId === dashArrayY.length) {
                yId = 0;
            }
        }
        console.log(ctx.canvas.toDataURL())

        // ctx.strokeStyle = 'red';
        // ctx.strokeRect(0, 0, pSize.width, pSize.height);
    }

    function brushShape(x: number, y: number, width: number, height: number) {
        if (decalOpt.image) {

            return;
        }

        // switch (decalOpt.shape) {
        //     case ''
        // }
    }

}

/**
 * Convert dash input into dashArray
 *
 * @param {DecalDashArrayX} dash dash input
 * @return {number[][]} normolized dash array
 */
function normalizeDashArrayX(dash: DecalDashArrayX): number[][] {
    if (!dash || typeof dash === 'object' && dash.length === 0) {
        return [[0, 0]];
    }
    if (typeof dash === 'number') {
        return [[dash, dash]];
    }

    /**
     * [20, 5] should be normalized into [[20, 5]],
     * while [20, [5, 10]] should be normalized into [[20, 20], [5, 10]]
     */
    let isAllNumber = true;
    for (let i = 0; i < dash.length; ++i) {
        if (typeof dash[i] !== 'number') {
            isAllNumber = false;
            break;
        }
    }
    if (isAllNumber) {
        return normalizeDashArrayX([dash as number[]]);
    }

    const result: number[][] = [];
    for (let i = 0; i < dash.length; ++i) {
        if (typeof dash[i] === 'number') {
            result.push([dash[i] as number, dash[i] as number]);
        }
        else if ((dash[i] as number[]).length % 2 === 1) {
            // [4, 2, 1] means |----  -    -- |----  -    -- |
            // so normalize it to be [4, 2, 1, 4, 2, 1]
            result.push((dash[i] as number[]).concat(dash[i]));
        }
        else {
            result.push((dash[i] as number[]).slice());
        }
    }
    return result;
}

/**
 * Convert dash input into dashArray
 *
 * @param {DecalDashArrayY} dash dash input
 * @return {number[]} normolized dash array
 */
function normalizeDashArrayY(dash: DecalDashArrayY): number[] {
    if (!dash || typeof dash === 'object' && dash.length === 0) {
        return [0, 0];
    }
    if (typeof dash === 'number') {
        return [dash, dash];
    }
    return dash.length % 2 ? dash.concat(dash) : dash.slice();
}

/**
 * Get block length of each line. A block is the length of dash line and space.
 * For example, a line with [4, 1] has a dash line of 4 and a space of 1 after
 * that, so the block length of this line is 5.
 *
 * @param {number[][]} dash dash arrary of X or Y
 * @return {number[]} block length of each line
 */
function getLineBlockLengthX(dash: number[][]): number[] {
    return map(dash, function (line) {
        return getLineBlockLengthY(line);
    });
}

function getLineBlockLengthY(dash: number[]): number {
    let blockLength = 0;
    for (let i = 0; i < dash.length; ++i) {
        blockLength += dash[i];
    }
    if (dash.length % 2 === 1) {
        // [4, 2, 1] means |----  -    -- |----  -    -- |
        // So total length is (4 + 2 + 1) * 2
        return blockLength * 2;
    }
    return blockLength;
}
