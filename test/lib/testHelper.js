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
            if (window.attachEvent) {
                window.attachEvent('onresize', chart.resize);
            } else if (window.addEventListener) {
                window.addEventListener('resize', chart.resize, false);
            }
        },

        // Clean params specified by `cleanList` and seed a param specifid by `newVal` in URL.
        setURLParam: function (cleanList, newVal) {
            var params = getParamListFromURL();
            for (var i = params.length - 1; i >= 0; i--) {
                for (var j = 0; j < cleanList.length; j++) {
                    if (params[i] === cleanList[j]) {
                        params.splice(i, 1);
                    }
                }
            }
            newVal && params.push(newVal);
            params.sort();
            location.search = params.join('&');
        },

        // Whether has param `val` in URL.
        hasURLParam: function (val) {
            var params = getParamListFromURL();
            for (var i = params.length - 1; i >= 0; i--) {
                if (params[i] === val) {
                    return true;
                }
            }
            return false;
        }

    };

    function getParamListFromURL() {
        var params = location.search.replace('?', '');
        return params ? params.split('&') : [];
    }

    context.testHelper = testHelper;

})(window);