(function (context) {

    var testHelper = {

        // opt: {number}: height, {Object}: {width, height, draggable}
        createChart: function (echarts, domOrId, option, opt) {
            if (typeof opt === 'number') {
                opt = {height: opt};
            }
            else {
                opt = opt || {};
            }

            var dom = getDom(domOrId);

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

        // opt: {option, info, infoKey, dataTable, width, height, draggable}
        create: function (echarts, domOrId, opt) {
            var dom = getDom(domOrId);

            if (!dom) {
                return;
            }

            var title = document.createElement('h1');
            var left = document.createElement('div');
            var chartContainer = document.createElement('div');
            var dataTableContainer = document.createElement('div');
            var infoContainer = document.createElement('div');

            title.setAttribute('title', dom.getAttribute('id'));

            title.className = 'test-title';

            dom.className = 'test-chart-block';
            left.className = 'test-chart-block-left';
            chartContainer.className = 'test-chart';
            dataTableContainer.className = 'test-data-table';
            infoContainer.className = 'test-info';

            if (opt.info) {
                dom.className += ' test-chart-block-has-right';
                infoContainer.className += ' test-chart-block-right';
            }

            left.appendChild(dataTableContainer);
            left.appendChild(chartContainer);
            dom.appendChild(infoContainer);
            dom.appendChild(left);
            dom.parentNode.insertBefore(title, dom);

            var chart;
            if (opt.title) {
                title.innerHTML = testHelper.encodeHTML(opt.title).replace('\n', '<br>');
            }
            if (opt.option) {
                chart = testHelper.createChart(echarts, chartContainer, opt.option, opt);
            }
            if (opt.dataTable) {
                dataTableContainer.innerHTML = createDataTableHTML(opt.dataTable);
            }
            if (opt.info) {
                infoContainer.innerHTML = createObjectHTML(opt.info, opt.infoKey || 'option');
            }

            return chart;
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

    function createDataTableHTML(data) {
        var sourceFormat = detectSourceFormat(data);
        if (!sourceFormat) {
            return '';
        }

        var html = ['<table class="test-data-table"><tbody>'];

        if (sourceFormat === 'arrayRows') {
            for (var i = 0; i < data.length; i++) {
                var line = data[i];
                var htmlLine = ['<tr>'];
                for (var j = 0; j < line.length; j++) {
                    var val = line[j];
                    htmlLine.push('<td>' + testHelper.encodeHTML(val) + '</td>');
                }
                htmlLine.push('</tr>');
                html.push(htmlLine.join(''));
            }
        }
        else if (sourceFormat === 'objectRows') {
            for (var i = 0; i < data.length; i++) {
                var line = data[i];
                var htmlLine = ['<tr>'];
                for (var key in line) {
                    if (line.hasOwnProperty(key)) {
                        htmlLine.push('<td class="test-data-table-key">' + testHelper.encodeHTML(key) + '</td>');
                        htmlLine.push('<td>' + testHelper.encodeHTML(line[key]) + '</td>');
                    }
                }
                htmlLine.push('</tr>');
                html.push(htmlLine.join(''));
            }
        }
        else if (sourceFormat === 'keyedColumns') {
            for (var key in data) {
                var htmlLine = ['<tr>'];
                htmlLine.push('<td class="test-data-table-key">' + testHelper.encodeHTML(key) + '</td>');
                if (data.hasOwnProperty(key)) {
                    var col = data[key] || [];
                    for (var i = 0; i < col.length; i++) {
                        htmlLine.push('<td>' + testHelper.encodeHTML(col[i]) + '</td>');
                    }
                }
                htmlLine.push('</tr>');
                html.push(htmlLine.join(''));
            }
        }

        html.push('</tbody></table>');

        return html.join('');
    }

    function detectSourceFormat(data) {
        if (data.length) {
            for (var i = 0, len = data.length; i < len; i++) {
                var item = data[i];

                if (item == null) {
                    continue;
                }
                else if (item.length) {
                    return 'arrayRows';
                }
                else if (typeof data === 'object') {
                    return 'objectRows';
                }
            }
        }
        else if (typeof data === 'object') {
            return 'keyedColumns';
        }
    }

    function createObjectHTML(obj, key) {
        return [
            '<pre class="test-print-object">',
            testHelper.encodeHTML(printObject(obj, key)),
            '</pre>'
        ].join('');
    }

    function getDom(domOrId) {
        return getType(domOrId) === 'string' ? document.getElementById(domOrId) : domOrId;
    }

    // return 'function', 'array', 'typedArray', 'regexp', 'date', 'object', 'boolean', 'number', 'string'
    // not accurate.
    var objToString = Object.prototype.toString;
    var TYPED_ARRAY = {
        '[object Int8Array]': 1,
        '[object Uint8Array]': 1,
        '[object Uint8ClampedArray]': 1,
        '[object Int16Array]': 1,
        '[object Uint16Array]': 1,
        '[object Int32Array]': 1,
        '[object Uint32Array]': 1,
        '[object Float32Array]': 1,
        '[object Float64Array]': 1
    };
    function getType(value) {
        var type = typeof value;
        var typeStr = objToString.call(value);

        return !!TYPED_ARRAY[objToString.call(value)]
            ? 'typedArray'
            : typeof type === 'function'
            ? 'function'
            : typeStr === '[object Array]'
            ? 'array'
            : typeStr === '[object Number]'
            ? 'number'
            : typeStr === '[object Boolean]'
            ? 'boolean'
            : typeStr === '[object String]'
            ? 'string'
            : typeStr === '[object RegExp]'
            ? 'regexp'
            : typeStr === '[object Date]'
            ? 'date'
            : !!value && type === 'object'
            ? 'object'
            : null;
    }

    // JSON.stringify(obj, null, 2) will vertically layout array, which takes too much space.
    function printObject(obj, key) {

        return doPrint(obj, key, 0).str;

        function doPrint(obj, key, depth) {
            var indent = 4;
            var lineBreak = '\n';
            var codeIndent = (new Array(depth * indent + 1)).join(' ');
            var subCodeIndent = (new Array((depth + 1) * indent + 1)).join(' ');
            var hasLineBreak = false;

            var preStr = key != null ? (key + ': ' ) : '';
            var str;

            var objType = getType(obj);

            switch (objType) {
                case 'function':
                    hasLineBreak = true;
                    str = preStr + '"' + obj + '"';
                    break;
                case 'regexp':
                case 'date':
                    str = preStr + '"' + obj + '"';
                    break;
                case 'array':
                case 'typedArray':
                    // If no break line in array, print in single line, like [12, 23, 34].
                    // else, each item takes a line.
                    var childBuilder = [];
                    for (var i = 0, len = obj.length; i < len; i++) {
                        var subResult = doPrint(obj[i], null, depth + 1);
                        childBuilder.push(subResult.str);
                        if (subResult.hasLineBreak) {
                            hasLineBreak = true;
                        }
                    }
                    var tail = hasLineBreak ? lineBreak : '';
                    var delimiter = ',' + (hasLineBreak ? (lineBreak + subCodeIndent) : ' ');
                    var subPre = hasLineBreak ? subCodeIndent : '';
                    var endPre = hasLineBreak ? codeIndent : '';
                    str = ''
                        + preStr + '[' + tail
                        + subPre + childBuilder.join(delimiter) + tail
                        + endPre + ']';
                    break;
                case 'object':
                    hasLineBreak = true;
                    var childBuilder = [];
                    for (var i in obj) {
                        if (obj.hasOwnProperty(i)) {
                            var subResult = doPrint(obj[i], i, depth + 1);
                            childBuilder.push(subCodeIndent + subResult.str);
                        }
                    }
                    str = ''
                        + preStr + '{' + lineBreak
                        + childBuilder.join(',' + lineBreak) + lineBreak
                        + codeIndent + '}';
                    break;
                case 'boolean':
                case 'number':
                    str = preStr + obj + '';
                    break;
                case 'string':
                    str = preStr + '"' + obj + '"';
                    break;
                default:
                    throw new Error('Illegal type "' + objType + '" at "' + obj + '"');
            }

            return {
                str: str,
                hasLineBreak: hasLineBreak
            };
        }
    }

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