(function (context) {

    var testHelper = {

        // opt: {number}: height, {Object}: {width, height, draggable}
        createChart: function (echarts, id, option, opt) {
            if (typeof opt === 'number') {
                opt = {height: opt};
            }
            else {
                opt = opt || {};
            }
            var dom = document.getElementById(id);
            if (dom) {
                if (opt.width != null) {
                    dom.style.width = opt.width + 'px';
                }
                if (opt.height != null) {
                    dom.style.height = opt.height + 'px';
                }

                var chart = echarts.init(dom);

                if (opt.draggable) {
                    window.draggable.init(dom, chart, {throttle: 70, addPlaceholder: true});
                }

                option && chart.setOption(option);
                testHelper.resizable(chart);

                return chart;
            }
        },

        resizable: function (chart) {
            window.addEventListener('resize', chart.resize);
        }
    };

    context.testHelper = testHelper;

})(window);