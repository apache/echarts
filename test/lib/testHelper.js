
/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

(function (context) {

    var DEFAULT_DATA_TABLE_LIMIT = 8;

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

    var testHelper = {};


    /**
     * @param {Object} opt
     * @param {string|Array.<string>} [opt.title] If array, each item is on a single line.
     * @param {Option} opt.option
     * @param {Object} [opt.info] info object to display.
     * @param {string} [opt.infoKey='option']
     * @param {Object|Array} [opt.dataTable]
     * @param {Array.<Object|Array>} [opt.dataTables] Multiple dataTables.
     * @param {number} [opt.dataTableLimit=DEFAULT_DATA_TABLE_LIMIT]
     * @param {number} [opt.width]
     * @param {number} [opt.height]
     * @param {boolean} [opt.draggable]
     * @param {boolean} [opt.lazyUpdate]
     * @param {boolean} [opt.notMerge]
     * @param {Array.<Object>|Object} [opt.button] {text: ..., onClick: ...}, or an array of them.
     * @param {Array.<Object>|Object} [opt.buttons] {text: ..., onClick: ...}, or an array of them.
     */
    testHelper.create = function (echarts, domOrId, opt) {
        var dom = getDom(domOrId);

        if (!dom) {
            return;
        }

        var title = document.createElement('div');
        var left = document.createElement('div');
        var chartContainer = document.createElement('div');
        var buttonsContainer = document.createElement('div');
        var dataTableContainer = document.createElement('div');
        var infoContainer = document.createElement('div');

        title.setAttribute('title', dom.getAttribute('id'));

        title.className = 'test-title';
        dom.className = 'test-chart-block';
        left.className = 'test-chart-block-left';
        chartContainer.className = 'test-chart';
        buttonsContainer.className = 'test-buttons';
        dataTableContainer.className = 'test-data-table';
        infoContainer.className = 'test-info';

        if (opt.info) {
            dom.className += ' test-chart-block-has-right';
            infoContainer.className += ' test-chart-block-right';
        }

        left.appendChild(buttonsContainer);
        left.appendChild(dataTableContainer);
        left.appendChild(chartContainer);
        dom.appendChild(infoContainer);
        dom.appendChild(left);
        dom.parentNode.insertBefore(title, dom);

        var chart;

        var optTitle = opt.title;
        if (optTitle) {
            if (optTitle instanceof Array) {
                optTitle = optTitle.join('\n');
            }
            title.innerHTML = '<div class="test-title-inner">'
                + testHelper.encodeHTML(optTitle).replace(/\n/g, '<br>')
                + '</div>';
        }

        if (opt.option) {
            chart = testHelper.createChart(echarts, chartContainer, opt.option, opt, opt.setOptionOpts);
        }

        var dataTables = opt.dataTables;
        if (!dataTables && opt.dataTable) {
            dataTables = [opt.dataTable];
        }
        if (dataTables) {
            var tableHTML = [];
            for (var i = 0; i < dataTables.length; i++) {
                tableHTML.push(createDataTableHTML(dataTables[i], opt));
            }
            dataTableContainer.innerHTML = tableHTML.join('');
        }

        var buttons = opt.buttons || opt.button;
        if (!(buttons instanceof Array)) {
            buttons = buttons ? [buttons] : [];
        }
        if (buttons.length) {
            for (var i = 0; i < buttons.length; i++) {
                var btnDefine = buttons[i];
                if (btnDefine) {
                    var btn = document.createElement('button');
                    btn.innerHTML = testHelper.encodeHTML(btnDefine.name || btnDefine.text || 'button');
                    btn.addEventListener('click', btnDefine.onClick || btnDefine.onclick);
                    buttonsContainer.appendChild(btn);
                }
            }
        }

        if (opt.info) {
            infoContainer.innerHTML = createObjectHTML(opt.info, opt.infoKey || 'option');
        }

        return chart;
    };

    /**
     * opt: {boolean}: lazyUpdate, {boolean}: notMerge, {number}: height, {Object}: {width, height, draggable}
     */
    testHelper.createChart = function (echarts, domOrId, option, opt) {
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

            option && chart.setOption(option, {
                lazyUpdate: opt.lazyUpdate,
                notMerge: opt.notMerge
            });
            testHelper.resizable(chart);

            return chart;
        }
    };


    testHelper.resizable = function (chart) {
        if (window.attachEvent) {
            window.attachEvent('onresize', chart.resize);
        } else if (window.addEventListener) {
            window.addEventListener('resize', chart.resize, false);
        }
    };

    // Clean params specified by `cleanList` and seed a param specifid by `newVal` in URL.
    testHelper.setURLParam = function (cleanList, newVal) {
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
    };

    // Whether has param `val` in URL.
    testHelper.hasURLParam = function (val) {
        var params = getParamListFromURL();
        for (var i = params.length - 1; i >= 0; i--) {
            if (params[i] === val) {
                return true;
            }
        }
        return false;
    };

    // Nodejs `path.resolve`.
    testHelper.resolve = function () {
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
    };

    testHelper.encodeHTML = function (source) {
        return String(source)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    /**
     * @public
     * @return {string} Current url dir.
     */
    testHelper.dir = function () {
        return location.origin + testHelper.resolve(location.pathname, '..');
    };

    /**
     * Not accurate.
     * @param {*} type
     * @return {string} 'function', 'array', 'typedArray', 'regexp',
     *       'date', 'object', 'boolean', 'number', 'string'
     */
    var getType = testHelper.getType = function (value) {
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
    };

    /**
     * JSON.stringify(obj, null, 2) will vertically layout array, which takes too much space.
     * Can print like:
     * [
     *     {name: 'xxx', value: 123},
     *     {name: 'xxx', value: 123},
     *     {name: 'xxx', value: 123}
     * ]
     * {
     *     arr: [33, 44, 55],
     *     str: 'xxx'
     * }
     *
     * @param {*} object
     * @param {opt|string} [opt] If string, means key.
     * @param {string} [opt.key=''] Top level key, if given, print like: 'someKey: [asdf]'
     * @param {string} [opt.objectLineBreak=true]
     * @param {string} [opt.arrayLineBreak=false]
     * @param {string} [opt.indent=4]
     * @param {string} [opt.lineBreak='\n']
     * @param {string} [opt.quotationMark='\'']
     */
    var printObject = testHelper.printObject = function (obj, opt) {
        opt = typeof opt === 'string'
            ? {key: opt}
            : (opt || {});

        var indent = opt.indent != null ? opt.indent : 4;
        var lineBreak = opt.lineBreak != null ? opt.lineBreak : '\n';
        var quotationMark = opt.quotationMark != null ? opt.quotationMark : '\'';

        return doPrint(obj, opt.key, 0).str;

        function doPrint(obj, key, depth) {
            var codeIndent = (new Array(depth * indent + 1)).join(' ');
            var subCodeIndent = (new Array((depth + 1) * indent + 1)).join(' ');
            var hasLineBreak = false;

            var preStr = key != null ? (key + ': ' ) : '';
            var str;

            var objType = getType(obj);

            switch (objType) {
                case 'function':
                    hasLineBreak = true;
                    str = preStr + quotationMark + obj + quotationMark;
                    break;
                case 'regexp':
                case 'date':
                    str = preStr + quotationMark + obj + quotationMark;
                    break;
                case 'array':
                case 'typedArray':
                    hasLineBreak = opt.arrayLineBreak != null ? opt.arrayLineBreak : false;
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
                    hasLineBreak = opt.objectLineBreak != null ? opt.objectLineBreak : true;
                    var childBuilder = [];
                    for (var i in obj) {
                        if (obj.hasOwnProperty(i)) {
                            var subResult = doPrint(obj[i], i, depth + 1);
                            childBuilder.push(subResult.str);
                            if (subResult.hasLineBreak) {
                                hasLineBreak = true;
                            }
                        }
                    }
                    str = ''
                        + preStr + '{' + (hasLineBreak ? lineBreak : '')
                        + (childBuilder.length
                            ? (hasLineBreak ? subCodeIndent : '') + childBuilder.join(',' + (hasLineBreak ? lineBreak + subCodeIndent: ' ')) + (hasLineBreak ? lineBreak: '')
                            : ''
                        )
                        + (hasLineBreak ? codeIndent : '') + '}';
                    break;
                case 'boolean':
                case 'number':
                    str = preStr + obj + '';
                    break;
                case 'string':
                    str = preStr + quotationMark + obj + quotationMark;
                    break;
                default:
                    str = preStr + obj + '';
            }

            return {
                str: str,
                hasLineBreak: hasLineBreak
            };
        }
    };



    function createDataTableHTML(data, opt) {
        var sourceFormat = detectSourceFormat(data);
        var dataTableLimit = opt.dataTableLimit || DEFAULT_DATA_TABLE_LIMIT;

        if (!sourceFormat) {
            return '';
        }

        var html = ['<table><tbody>'];

        if (sourceFormat === 'arrayRows') {
            for (var i = 0; i < data.length && i <= dataTableLimit; i++) {
                var line = data[i];
                var htmlLine = ['<tr>'];
                for (var j = 0; j < line.length; j++) {
                    var val = i === dataTableLimit ? '...' : line[j];
                    htmlLine.push('<td>' + testHelper.encodeHTML(val) + '</td>');
                }
                htmlLine.push('</tr>');
                html.push(htmlLine.join(''));
            }
        }
        else if (sourceFormat === 'objectRows') {
            for (var i = 0; i < data.length && i <= dataTableLimit; i++) {
                var line = data[i];
                var htmlLine = ['<tr>'];
                for (var key in line) {
                    if (line.hasOwnProperty(key)) {
                        var keyText = i === dataTableLimit ? '...' : key;
                        htmlLine.push('<td class="test-data-table-key">' + testHelper.encodeHTML(keyText) + '</td>');
                        var val = i === dataTableLimit ? '...' : line[key];
                        htmlLine.push('<td>' + testHelper.encodeHTML(val) + '</td>');
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
                    for (var i = 0; i < col.length && i <= dataTableLimit; i++) {
                        var val = i === dataTableLimit ? '...' : col[i];
                        htmlLine.push('<td>' + testHelper.encodeHTML(val) + '</td>');
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

    var getDom = testHelper.getDom = function (domOrId) {
        return getType(domOrId) === 'string' ? document.getElementById(domOrId) : domOrId;
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