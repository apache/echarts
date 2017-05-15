(function (context) {

    var testHelper = {

        createChart: function (echarts, id, option, height) {
            var dom = document.getElementById(id);
            if (dom) {
                if (height != null) {
                    dom.style.height = height + 'px';
                }

                var chart = echarts.init(dom);
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