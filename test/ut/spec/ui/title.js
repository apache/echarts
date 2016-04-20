describe('title', function() {

    var uiHelper = window.uiHelper;

    // canvas comparing strategy, 'stack' or 'content'
    // see ../../core/uiHelper.js for more detail
    var STRATEGY = 'stack';

    describe('title-show', function() {
        it('should display given title by default', function(done) {
            uiHelper.expectEqualCanvas(STRATEGY, function(echarts) {
                return uiHelper.getRenderedCanvas(echarts, function(myChart) {
                    myChart.setOption({
                        series: [],
                        title: {
                            text: 'test title'
                        }
                    });
                });
            }, done);
        });

        it('should hide title when show is false', function(done) {
            uiHelper.expectEqualCanvas(STRATEGY, function(echarts) {
                return uiHelper.getRenderedCanvas(echarts, function(myChart) {
                    myChart.setOption({
                        series: [],
                        title: {
                            text: 'hidden title',
                            display: false
                        }
                    });
                });
            }, done);
        });
    });

});
