(function () {
    if (typeof autorun !== 'undefined') {
        return;
    }
    var autorun = {};
    autorun.createScreenshotTest = function () {};
    autorun.compareScreenshot = function () {};
    autorun.finish = function () {};
})();