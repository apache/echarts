(function (context) {

    var helper = context.uiHelper = {};

    /**
     * expect canvas.toDataURL to be the same by old and new echarts
     * @param  {function} doTest test body
     * @param  {function} done   done callback provided by jasmine
     */
    helper.expectEqualCanvasContent = function(doTest, done) {
        window.require(['oldEcharts', 'newEcharts'], function (oldE, newE) {
            var oldCanvas = doTest(oldE);
            var newCanvas = doTest(newE);
            expect(oldCanvas.toDataURL()).toEqual(newCanvas.toDataURL());
            done();
        });
    };

    /**
     * expect canvas operation stack provided by canteen
     * to be the same by old and new echarts
     * @param  {function} doTest test body
     * @param  {function} done   done callback provided by jasmine
     */
    helper.expectEqualCanvasStack = function(doTest, done) {
        window.require(['oldEcharts', 'newEcharts'], function (oldE, newE) {
            var oldCtx = doTest(oldE).getContext('2d');
            var newCtx = doTest(newE).getContext('2d');
            // hash of canvas operation stack, provided by canteen
            // https://github.com/platfora/Canteen
            expect(oldCtx.hash()).toEqual(newCtx.hash());
            done();
        });
    };

    /**
     * expect canvas with strategy
     * @param  {string}   strategy 'content' or 'stack'
     * @param  {function} doTest test body
     * @param  {function} done   done callback provided by jasmine
     */
    helper.expectEqualCanvas = function(strategy, doTest, done) {
        if (strategy === 'content') {
            helper.expectEqualCanvasContent(doTest, done);
        } else if (strategy === 'stack') {
            helper.expectEqualCanvasStack(doTest, done);
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

})(window);
