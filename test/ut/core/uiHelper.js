(function (context) {

    var helper = context.uiHelper = {};

    // canvas comparing strategy, 'stack' or 'content'
    var STRATEGY = 'stack';

    // dom for failed cases
    var failedDom = document.createElement('div');
    failedDom.setAttribute('id', 'failed-panel');
    var hasFailedDom = false;

    /**
     * expect canvas.toDataURL to be the same by old and new echarts
     * @param  {string} title title of suite and case
     * @param  {function} doTest test body
     * @param  {function} done   done callback provided by jasmine
     */
    helper.expectEqualCanvasContent = function(title, doTest, done) {
        var that = this;
        window.require(['oldEcharts', 'newEcharts'], function (oldE, newE) {
            var oldImg = doTest(oldE).toDataURL();
            var newImg = doTest(newE).toDataURL();
            if (oldImg !== newImg) {
                that.addFailedCases(title, oldImg, newImg);
            }
            expect(oldImg).toEqual(newImg);
            done();
        });
    };

    /**
     * expect canvas operation stack provided by canteen
     * to be the same by old and new echarts
     * @param  {string} title title of suite and case
     * @param  {function} doTest test body
     * @param  {function} done   done callback provided by jasmine
     */
    helper.expectEqualCanvasStack = function(title, doTest, done) {
        var that = this;
        window.require(['oldEcharts', 'newEcharts'], function (oldE, newE) {
            var oldCanvas = doTest(oldE);
            var newCanvas = doTest(newE);
            var oldImg = oldCanvas.toDataURL();
            var newImg = newCanvas.toDataURL();
            if (oldImg !== newImg) {
                that.addFailedCases(title, oldImg, newImg);
            }
            var oldCtx = oldCanvas.getContext('2d');
            var newCtx = newCanvas.getContext('2d');
            // hash of canvas operation stack, provided by canteen
            // https://github.com/platfora/Canteen
            expect(oldCtx.hash()).toEqual(newCtx.hash());
            done();
        });
    };

    /**
     * expect canvas with strategy
     * @param  {string} title title of suite and case
     * @param  {function} doTest test body
     * @param  {function} done   done callback provided by jasmine
     */
    helper.expectEqualCanvas = function(title, doTest, done) {
        if (STRATEGY === 'content') {
            helper.expectEqualCanvasContent(title, doTest, done);
        } else if (STRATEGY === 'stack') {
            helper.expectEqualCanvasStack(title, doTest, done);
        } else {
            console.error('Invalid equal canvas strategy!');
        }
    };

    /**
     * get rendered canvas with echarts and operations
     * @param  {object}   echarts    echarts
     * @param  {function} operations operations with echarts
     * @return {Canvas}              canvas rendered by echarts
     */
    helper.getRenderedCanvas = function(echarts, operations) {
        // init canvas with echarts
        var canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        var myChart = echarts.init(canvas);

        // user defined operations
        operations(myChart);

        return canvas;
    };

    /**
     * run test with only setOption
     * @param  {string} name      name of the test
     * @param  {object} option    echarts option
     */
    helper.testOption = function(name, option) {
        var that = this;
        it(name, function(done) {
            that.expectEqualCanvas(name, function(ec) {
                var canvas = that.getRenderedCanvas(ec, function(myChart) {
                    myChart.setOption(option);
                });
                return canvas;
            }, done);
        });
    }

    /**
     * run test with setOption for whole spec
     * @param  {string}   specName spec name
     * @param  {object[]} suites    arrary of suites
     */
    helper.testOptionSpec = function(specName, suites) {
        for (var sid = 0, slen = suites.length; sid < slen; ++sid) {
            (function(suiteName, cases) {
                describe('show', function() {
                    for (var cid = 0, clen = cases.length; cid < clen; ++cid) {var name = specName + ' - ' + suiteName + ': '
                            + cases[cid].name;
                        uiHelper.testOption(name, cases[cid].option);
                    }
                });
            })(suites[sid].name, suites[sid].cases);
        }
    }

    /**
     * @param {string} name name of the test
     * @param {string} oldImgSrc old canvas.toDataURL value
     * @param {string} newImgSrc new canvas.toDataURL value
     * add a failed case in dom
     */
    helper.addFailedCases = function(name, oldImgSrc, newImgSrc) {
        // group of this case
        var group = document.createElement('div');
        var title = document.createElement('h6');
        title.innerHTML = name + '. Here are old, new, and diff images.';
        group.appendChild(title);

        // old image and new image
        var oldImg = document.createElement('img');
        oldImg.src = oldImgSrc;
        oldImg.setAttribute('title', 'Old Image');
        var newImg = document.createElement('img');
        newImg.src = newImgSrc;
        newImg.setAttribute('title', 'New Image');
        group.appendChild(oldImg);
        group.appendChild(newImg);

        // diff image
        var diff = imagediff.diff(oldImg, newImg);
        console.log(diff);
        var canvas = document.createElement('canvas');
        canvas.width = oldImg.width;
        canvas.height = oldImg.height;
        var ctx = canvas.getContext('2d');
        ctx.putImageData(diff, 0, 0);
        var diffImg = document.createElement('img');
        diffImg.src = canvas.toDataURL();
        diffImg.setAttribute('title', 'Diff Image');
        group.appendChild(diffImg);

        failedDom.appendChild(group);

        // append to dom
        if (!hasFailedDom) {
            var body = document.getElementsByTagName('body')[0];
            body.appendChild(failedDom);
            hasFailedDom = true;
        }
    };

})(window);
