(function (global) {
    if (global.autorun) {
        return;
    }

    var autorun = {};
    var inPuppeteer = typeof puppeteerScreenshot !== 'undefined';

    var NativeDate = window.Date;

    var fixedTimestamp = 1566458693300;
    var actualTimestamp = NativeDate.now();

    function MockDate(params) {
        if (!params) {
            var elapsedTime = NativeDate.now() - actualTimestamp;
            return new NativeDate(fixedTimestamp + elapsedTime);
        }
        else {
            return new NativeDate(params);
        }
    }
    MockDate.prototype = new Date();

    autorun.createScreenshotTest = function (desc, elementQuery, waitTime) {

    }

    /**
     * Take screenshot immediately.
     * @param {string} desc
     * @param {string} [elementQuery] If only screenshot specifed element. Will do full page screenshot if it's not give.
     */
    autorun.compareScreenshot = function (desc, elementQuery) {
        if (!inPuppeteer) {
            return Promise.resolve();
        }

        return puppeteerScreenshot(desc, elementQuery);
    };

    autorun.shouldBe = function (expected, actual) {

    };

    /**
     * Finish the test.
     */
    autorun.finish = function () {
        if (!inPuppeteer) {
            return Promise.resolve();
        }
        return puppeteerFinishTest();
    };


    if (inPuppeteer) {
        let myRandom = new Math.seedrandom('echarts-test');
        // Fixed random generator
        Math.random = function () {
            var val = myRandom();
            return val;
        };

        // Fixed date
        window.Date = MockDate;
    }

    global.autorun = autorun;

})(window);