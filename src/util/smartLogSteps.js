/**
 * Echarts, Zoomdata 2012-2015
 *
 * @author Ievgenii (@Ievgeny, ievgeny@zoomdata.com)
 *
 */

/**
 * @function    smartLogSteps
 * @param       {Number}    min             Minimum
 * @param       {Number}    max             Maximum
 * @param       {Object}    [opts]          Configurable options
 * @param       {Number}     opts.base      Logarithmic base
 * @param       {Boolean}    opts.positive  Logarithmic sign
 * @param       {Boolean}    opts.minLocked Locked min value
 * @param       {Boolean}    opts.maxLocked Locked max value
 * @param       {Boolean}    opts.type      Axis type main/detailed
 * @return      {Object}    {min:           New min,
 *                           max:           New max,
 *                           secs:          Sections amount,
 *                           pnts:          [Array of data points]
 *                           log_pnts:      [Array of logarithmic values of data points]
 *                           positive:      Type of data set (Positive/Negative/Mixed)
 *                           base:          Logarithmic base
 *                           precision:     Coefficient on which logarithm data should be
 *                                          multiplied to obtain data in real min/max borders
 *                           methods:       Set of logarithmic methods}
 */
define(function() {

    var custOpts;
    var custBase;
    var positive;
    var minLocked;
    var maxLocked;
    var type;
    var newMin;
    var newMax;

    var MT          = Math;
    var MATH_ROUND  = MT.round;
    var MATH_FLOOR  = MT.floor;
    var MATH_CEIL   = MT.ceil;
    var MATH_ABS    = MT.abs;
    var MATH_LOG      = MT.log;
    var MATH_POW      = MT.pow;

    function log(x) {
        return (positive ? MATH_LOG(x < 0 ? 0 : x) : -MATH_LOG(x > 0 ? 0 : -x)) / MATH_LOG(custBase);
    }
    function pow(x) {
        return positive ? MATh_POW(custBase, x) : -MATH_POW(custBase, -x);
    }
    function isint(x) { return x === MATH_FLOOR(x); }
    function logConverter(arr) { return (domain = arr.map(Number)).map(log); }

    /**
     * Main function. Return data object with values for axis building
     * @param min
     * @param max
     * @param opts
     * @returns {*}
     */
    function smartLogSteps(min, max, opts) {
        custOpts  = opts || {};
        custBase  = opts.base || 10;
        positive  = opts.positive || true;
        minLocked = opts.minLocked || false;
        maxLocked = opts.maxLocked || false;
        newMin = noNull(min, positive);
        newMax = noNull(max, positive);
        type = opts.type || 'detailed';

        try {
            positive = setSign(newMin, newMax);
        } catch(e) {
            console.log(e);
        }

        return coreCalc(newMin, newMax);
    }

    /**
     * Determine sign of data set (positive, negative, mixed)
     * @param min
     * @param max
     * @returns {boolean}
     */
    function setSign(min, max) {
        if (min > max) {max = [min, min = max][0];}
        if (min >= 0) { return true; }
        if (min < 0 && max < 0) { return false; }
        throw "invalid limits";
    }

    /**
     * Since logarithm of 0 === Infinity we need to avoid this situation
     * @param value
     * @param isPositive
     * @returns {*}
     */
    function noNull(value, isPositive) {
        if (isPositive && value === 0) {return 1}
        if (!isPositive && value === 0) {return -1}
        return value;
    }

    /**
     * Build an array of objects. Each object contains amount
     * of corresponding shares (n/logBase, n/(logBase*i), ..., end: n < 1)
     * and digits (1, logBase, logBase^2, ..., logBase^n)
     * @param number
     * @param digit
     * @param container
     * @returns {*}
     */
    function div(number, digit, container) {
        container.push({digit: digit, number: number%custBase });
        if (number/custBase < 1) return container;
        return div(number/custBase, digit*custBase, container);
    }

    /**
     * Main data set calculation function. Calculate main and extended domains
     * @param min
     * @param max
     * @returns {*}
     */
    function coreCalc(min, max) {
        var mainDomain     = [];
        var extendedDomain = [];
        var lastDigit;
        var lastNumber;
        var digits = div(newMax, 1, []);

        lastDigit = digits[digits.length-1].digit;
        lastNumber = digits[digits.length-1].number;

        if (Math.ceil(lastNumber*custBase) >= lastDigit) // Add one more object to guarantee all data in range
            digits.push({digit: lastDigit*custBase, number: Math.ceil(lastNumber)});

        lastDigit = digits[digits.length-1].digit;
        lastNumber = digits[digits.length-1].number;

        mainDomain = digits.map(function(elem) { return elem.digit; });
        if (max > lastDigit) // Add pseudo digit to guarantee all data in mainDomain
            mainDomain.push(lastDigit * Math.ceil(lastNumber));

        setMin(newMin, mainDomain); // Fit min border to ranges
        setMax(newMax, mainDomain); // Fit max border to ranges

        for (var i = 0; i < mainDomain.length; i++) { // Calculate extended domain
            var digitSet = div(mainDomain[i], 1, []);
            var increment = digitSet[digitSet.length - 1].digit;

            for (var j = mainDomain[i]; j < mainDomain[i+1]; j += increment) {
                if (j > mainDomain[i]) { // If first value%base !== 0 next tick value should be calculated accordingly
                    var next = div(j, 1, []);
                    var num = Math.floor(next[next.length - 1].number) * increment;
                    extendedDomain.push(num);
                } else {
                    extendedDomain.push(j); // First value should be placed without changes
                }
            }
        }
        extendedDomain.push(mainDomain[mainDomain.length-1]); // Add last value from main domain

        return makeResult(mainDomain, extendedDomain);
    }

    /**
     * Set min domain value (dependent on minLocked option)
     * @param min
     * @param domain
     */
    function setMin(min, domain) {
        if (!minLocked) return;

        for (var f = 0; f < domain.length;) {
            if (domain[f] < min) {
                domain.splice(f, 1);
            } else {
                f++;
            }
        }
        if (domain[0] !== min) domain.unshift(min.toFixed(2) - 0);
    }

    /**
     * Set max domain value (dependent on maxLocked option)
     * @param max
     * @param domain
     */
    function setMax(max, domain) {
        if (!maxLocked) return;

        for (var f = 0; f < domain.length;) {
            if (domain[f] > max) {
                domain.splice(f, 1);
            } else {
                f++;
            }
        }
        if (domain[domain.length-1] !== max) domain.push(max.toFixed(2) - 0);
    }

    /**
     * Calculate coefficient on which logarithmic data should be multiplied
     * to obtain values n real [min, max] range
     * @param domain
     * @param max
     * @returns {number}
     */
    function precisionCoef(domain, max) {
        var logMax = Math.max.apply(Math, logConverter(domain));

        return max / logMax;
    }

    /**
     * Generate result object for return
     * @param mainDomain
     * @param extendedDomain
     * @returns {{min: number, max: number, secs: *, pnts: *, log_pnts: *, positive: *, base: *, precision: number, methods: {log: Function}}}
     */
    function makeResult(mainDomain, extendedDomain) {
        var rMin      = log(mainDomain[0]);
        var rMax      = log(mainDomain[mainDomain.length-1]);
        var rSecs     = type === 'detailed' ? extendedDomain.length : mainDomain.length;
        var rPnts     = type === 'detailed' ? extendedDomain : mainDomain;
        var rLogPnts  = type === 'detailed' ? logConverter(extendedDomain) : logConverter(mainDomain);
        var precision = precisionCoef(mainDomain, newMax);
        var methods   = {
            log: function(x, base, positive) {
                return (positive ? Math.log(x < 0 ? 0 : x) : -Math.log(x > 0 ? 0 : -x)) / Math.log(base);
            }
        };

        return {
            min:       rMin,
            max:       rMax,
            secs:      rSecs,
            pnts:      rPnts,
            log_pnts:  rLogPnts,
            positive:  positive,
            base:      custBase,
            precision: precision,
            methods:   methods
        }
    }

    return smartLogSteps;
});
