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
        },

        // Nodejs `path.resolve`.
        resolve: function () {
            var resolvedPath = '';
            var resolvedAbsolute;

            for (var i = arguments.length - 1; i >= 0 && !resolvedAbsolute; i--) {
                var path = arguments[i];
                if (path) {
                    resolvedPath = path + '/' + resolvedPath;
                    resolvedAbsolute = path[0] === '/';
                }
            }

            if (!resolvedAbsolute) {
                throw new Error('At least one absolute path should be input.');
            }

            // Normalize the path
            resolvedPath = normalizePathArray(resolvedPath.split('/'), false).join('/');

            return '/' + resolvedPath;
        },

        encodeHTML: function (source) {
            return String(source)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        /**
         * @public
         * @return {string} Current url dir.
         */
        dir: function () {
            return location.origin + testHelper.resolve(location.pathname, '..');
        }

    };

    // resolves . and .. elements in a path array with directory names there
    // must be no slashes or device names (c:\) in the array
    // (so also no leading and trailing slashes - it does not distinguish
    // relative and absolute paths)
    function normalizePathArray(parts, allowAboveRoot) {
        var res = [];
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];

            // ignore empty parts
            if (!p || p === '.') {
                continue;
            }

            if (p === '..') {
                if (res.length && res[res.length - 1] !== '..') {
                    res.pop();
                } else if (allowAboveRoot) {
                    res.push('..');
                }
            } else {
                res.push(p);
            }
        }

        return res;
    }

    function getParamListFromURL() {
        var params = location.search.replace('?', '');
        return params ? params.split('&') : [];
    }

    context.testHelper = testHelper;

})(window);