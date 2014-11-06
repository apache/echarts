/**
 * echarts 值轴刻度线计算方法
 *
 * @author xieshiwei (谢世威, xieshiwei@baidu.com)
 */

/**
 * 最值、跨度、步长取近似值
 * @function    smartSteps
 * @param       {Number}    min         最小值
 * @param       {Number}    max         最大值
 * @param       {Number}    [sections]  段数只能是 [0, 99] 的整数，段数为 0 或者不指定段数时，将自动调整段数
 * @param       {Object}    [opts]      其它扩展参数
 * @param       {Array}     opts.steps  自定义步长备选值，如 [10, 12, 15, 20, 25, 30, 40, 50, 60, 80] ，但必须 => [10, 99]
 * @return      {Object}    {min: 新最小值, max: 新最大值, secs: 分段数, step: 每段长, fix: 小数保留位数, pnts: [分段结果]}
 */
define(function() {
    var mySections  = [4, 5, 6];
    var mySteps     = [10, 25, 50];
    var custSteps   = 0;
    var Mt          = Math;
    var MATH_ROUND  = Mt.round;
    var MATH_FLOOR  = Mt.floor;
    var MATH_CEIL   = Mt.ceil;

    function MATH_LOG(n) {return Mt.log(n) / Mt.LN10;}
    function MATH_POW(n) {return Mt.pow(10, n);}

    function smartSteps(min, max, sections, opts) {
        // 拿公共变量来接收 opts.steps 这个参数，就不用带着参数层层传递了，注意在函数的最终出口处释放这个值
        custSteps   = (opts || {}).steps || mySteps;
        sections    = MATH_ROUND(+sections || 0) % 99;      // 段数限定在 [0, 99]
        min         = +min || 0;
        max         = +max || 0;
        if (min > max) {max = [min, min = max][0];}         // 最值交换
        var span    = max - min;
        // 跨度为零，即最大值等于最小值的情况
        if (span === 0) {
            return forSpan0(min, max, sections);
        }
        else if (span < (sections || 5)) { // 跨度值小于要分的段数，步长必定要小于 1
            // 步长小于 1 同时两个最值都是整数，特别处理
            if (min === MATH_ROUND(min) && max === MATH_ROUND(max)) {
                return forInteger(min, max, sections);
            }
        }
        return coreCalc(min, max, sections);
    }

    /**
     * 最值、跨度、步长取近似值
     * @function    smartSteps.coreCalc
     * @description 参数及返回值均同 smartSteps
     */
    function coreCalc(min, max, sections, opts) {
        custSteps       = custSteps || (opts || {}).steps || mySteps;
        var step;
        // var newMin;
        // var newMax;
        var tmpSection  = sections || mySections[mySections.length - 1];
        var span        = getCeil(max - min);               // 求 span 的近似值，返回结果是 量级 计数法，c * 10 ^ n ，其中 c => [10, 99]
        var expon       = span.n;                           // 为了让后面的计算都以整数进行，设置一个基准量级
        span            = span.c;                           // 可以认为，这是跨度的最小近似值，为了满足后继条件，这个值可能会被多次延展
        step            = getCeil(span / tmpSection, custSteps); // 跨度最小值 / 段数最大值 是步长最小值
        if (step.n < 0) {                              // 如果跨度小而段数多，步长出现小数时，再次放大有关值，保持整数计算
            expon += step.n;                           // 各种计算的基准量级，保证 步长（最容易出现小数的量） 是整数
            span *= MATH_POW(-step.n);
            step.n = 0;
        }
        step = step.c * MATH_POW(step.n);
        var zoom = MATH_POW(expon);
        var params = {
            min: min,
            zmin: min / zoom,
            max: max,
            zmax: max / zoom,
            span: span,
            step: step,
            secs: tmpSection,
            exp: expon
        };
        if (!sections) { // 不指定 段数 的情况
            look4sections(params);
        }
        else {
            look4step(params);
        }

        // 如果原始值都是整数，让输出值也保持整数
        if ((min === MATH_ROUND(min)) && (max === MATH_ROUND(max))) {
            step = params.step * zoom;
            if (params.exp < 0 && step !== MATH_ROUND(step) && min * max >= 0) {
                step = MATH_FLOOR(step);
                span = step * params.secs;
                if (span < max - min) {
                    step += 1;
                    span = step * params.secs;
                }
                if (span >= max - min) {
                    var deltaSpan = span - (max - min);
                    params.max = MATH_ROUND(max + deltaSpan / 2);
                    params.min = MATH_ROUND(min - deltaSpan / 2);
                    params.step = step;
                    params.span = span;
                    params.exp  = 0;
                }
            }
        }
        var arrMM = cross0(min, max, params.min, params.max); // 避免跨 0
        return makeResult(arrMM[0], arrMM[1], params.secs, params.exp);
    }

    function look4sections(params) {
        var sections    = params.secs;
        var newMin;
        var newMax;
        var tmpSpan;
        var tmpStep;
        var minStep     = params.step;
        var minSpan     = params.step * sections; // 上面计算了在最大段数下的最小步长，希望这对整体跨度的影响较小，但其它段数也要尝试一遍
        for (var i      = mySections.length - 1; i--;) {
            // 有点像二元一次方程，段数 和 步长 两个未知数
            // 下面遍历可选的段数，各找一个匹配的步长，然后以 跨度最小 作为最优解的依据
            sections    = mySections[i];
            tmpStep     = getCeil(params.span / sections, custSteps).d;
            newMin      = MATH_FLOOR(params.zmin / tmpStep) * tmpStep;
            newMax      = MATH_CEIL(params.zmax / tmpStep) * tmpStep;
            tmpSpan     = newMax - newMin;      // 步长的误差被 段数 成倍放大，可能会给跨度造成更大的误差，使最后的段数大于预期的最大值
            if (tmpSpan < minSpan) {
                minSpan = tmpSpan;
                minStep = tmpStep;
            }
        }
        newMin          = MATH_FLOOR(params.zmin / minStep) * minStep;
        newMax          = MATH_CEIL(params.zmax / minStep) * minStep;
        sections        = (newMax - newMin) / minStep;
        if (sections < 3) { // 如果查表所得步长比最小步长大得多，那么段数就可能变得很小
            sections *= 2;
        }
        params.min      = newMin;
        params.max      = newMax;
        params.step     = minStep;
        params.secs     = sections;
    }

    function look4step(params) {
        var newMax, span;
        var newMin      = params.zmax;                          // 主要是找一找个步长，能在指定的段数下，覆盖到原始最值
        var step        = params.step;
        while (newMin   > params.zmin) {
            span        = step * params.secs;
            newMax      = MATH_CEIL(params.zmax / step) * step; // 优先保证 max 端的误差最小，试看 min 值能否被覆盖到
            newMin      = newMax - span;
            step        = getCeil(step * 1.01, custSteps).d;    // 让 step 的增长允许进入更高一个量级
        }
        step            = span / params.secs;
        var deltaMin    = params.zmin - newMin;                 // 上面的计算可能会让 min 端的误差更大，下面尝试均衡误差
        var deltaMax    = newMax - params.zmax;
        var deltaDelta  = deltaMin - deltaMax;
        if (deltaDelta >= step * 2) {                           // 当 min 端的误差比 max 端大很多时，考虑将 newMin newMax 同时上移
            deltaDelta  = MATH_FLOOR(deltaDelta / step) * step;
            newMin     += deltaDelta;
            newMax     += deltaDelta;
        }
        params.min = newMin;
        params.max = newMax;
        params.step = step;
    }

    /**
     * 构造返回值，主要是小数计算精度处理
     * @param   {Number}    newMin      最小值
     * @param   {Number}    newMax      最大值
     * @param   {Number}    sections    分段数
     * @param   {Number}    [expon]     放大率指数，用于避免小数计算的精度问题
     * @return  {Object}                同 smartSteps
     */
    function makeResult(newMin, newMax, sections, expon) {
        expon       = expon || 0;
        var zoom    = MATH_POW(expon);
        var step    = (newMax - newMin) / sections;
        var fixTo   = 0;
        var points  = [];
        for (var i  = sections + 1; i--;) {                 // 因为点数比段数多 1
            points[i] = (newMin + step * i) * zoom;         // 如果不涉及小数问题，这里就直接使用数值型
        }
        if (expon   < 0) {
            fixTo   = decimals(zoom);                       // 前面的计算使得 zoom 的小数位数多于 step 的真实小数位
            step    = +(step * zoom).toFixed(fixTo);
            fixTo   = decimals(step);                       // 经过上面的处理，可以得到 step 的真实小数位数了
            newMin  = +(newMin * zoom).toFixed(fixTo);
            newMax  = +(newMax * zoom).toFixed(fixTo);
            for (var i = points.length; i--;) {
                points[i] = points[i].toFixed(fixTo);       // 为保证小数点对齐，统一转为字符型
                +points[i] === 0 && (points[i] = '0');      // 0.000 不好看
            }
        }
        else {
            newMin *= zoom;
            newMax *= zoom;
            step   *= zoom;
        }
        custSteps = 0;
        // custSteps 这个公共变量可能持用了对用户参数的引用
        // 这里是函数的最终出口，释放引用

        return {
            min: newMin,    // 新最小值
            max: newMax,    // 新最大值
            secs: sections, // 分段数
            step: step,     // 每段长
            fix: fixTo,     // 小数保留位数，0 则为整数
            pnts: points    // 分段结果，整数都是数值型，小数时为了对齐小数点，都是字符型，但其中 0 不带小数点，即没有 "0.000"
        };
    }

    /**
     * 求不小于原数的近似数，结果用 量级 计数法表示：c * 10 ^ n ，其中 c n 都是整数，且 c => [10, 99]
     * @param   {Number}    num         原数值，不适用于高精度需求
     * @param   {Array}     [rounds]    在取近似时，提供预置选项，让 c 近似到 rounds 中的某项
     * @param   {Boolean}   [butFloor]  为 true 时不用 Math.ceil 反而用 Math.floor 取近似，原始值 >= c * 10 ^ n
     * @return  {Object}    {c: c, n: n, d: d} 其中 c n 都是整数，且 c => [10, 99] ，原始值 <= c * 10 ^ n
     */
    function getCeil(num, rounds, butFloor) {
        // 类似科学记数法，姑且称为 量级 记数法，故意将指数减 1，于是小数部分被放大 10 倍，以避免小数计算的精度问题
        var n10 = MATH_FLOOR(MATH_LOG(num)) - 1;
        
        // 此时的 c10 => [10, 100)，下面取近似之后是 [10, 100]，toFixed 处理小数精度问题，所以不适用于高精度需求
        var c10 = +(num * MATH_POW(-n10)).toFixed(9);
        
        if (!rounds) {
            c10    = butFloor ? MATH_FLOOR(c10) : MATH_CEIL(c10);
        }
        else {
            var i;
            if (butFloor) {
                i = rounds.length;
                /* jshint ignore:start */
                while (c10 < rounds[--i]) {
                    // 在预置的近似数中，挑一个最接近但不大于目标值的项，如果挑不出来，则下标溢出 while 结束
                }
                /* jshint ignore:end */
            }
            else {
                i = -1;
                /* jshint ignore:start */
                while (c10 > rounds[++i]) {
                    // 按 接近但不小于目标值 的标准挑数
                }
                /* jshint ignore:end */
            }
            c10 = custSteps[i];                // 如果预置数都小于目标值，则下标溢出，c10 = undefined
        }
        if (!c10 || c10 > 99 || c10 < 10) {
            c10 = 10;
            n10 += butFloor ? -1 : 1;          // 如果是向下取近似，则 c10 一定是向下超出区间 [10, 99] ，所以 n10 - 1 ，反之亦然
        }
        return {
            c: c10,
            n: n10,
            d: c10 * MATH_POW(n10)
        };
    }

    /**
     * 取一个数的小数位数
     * @param   {Number}    num         原数值
     * @return  {Number}    decimals    整数则返回 0 ，小数则返回小数点后的位数
     */
    function decimals(num) {
        num = String(+num).split('.');
        return num.length > 1 ? num.pop().length : 0;
    }

    function forSpan0(min, max, sections) {
        sections = sections || 5;                           // 当最大值等于最小值时，就可以随便分几段了
        if (max === 0) {
            return makeResult(0, sections, sections);       // 如果全部值都是 0 ，则以 0 为起点，步长按 1 分段
        }
        var delta = Mt.abs(max / sections);                 // 以最值为中心，上下各延展一小段
        return coreCalc(min - delta, max + delta, sections);
    }

    function forInteger(min, max, sections) {               // 都是整数，且跨度小于段数，特别处理
        sections = sections || 5;
        var span2  = (sections - max + min) / 2;           // 向上下延展跨度
        var newMax  = MATH_ROUND(max + span2);
        var newMin  = MATH_ROUND(min - span2);
        var arrMM   = cross0(min, max, newMin, newMax);     // 避免跨 0
        return makeResult(arrMM[0], arrMM[1], sections);
    }

    function cross0(min, max, newMin, newMax) {
        if (newMin < 0 && min >= 0) {                      // 当原始值都在 0 以上时，让新值也都在 0 以上
            newMax -= newMin;
            newMin  = 0;
        }
        else if (newMax > 0 && max <= 0) {                // 尽量不让调整后的最值横跨 0 线
            newMin -= newMax;
            newMax  = 0;
        }
        return [newMin, newMax];
    }

    return smartSteps;
});

