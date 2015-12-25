define(function (require) {

    var zrUtil = require('zrender/core/util');
    var eventTool = require('zrender/core/event');

    /**
     * Group series into two types
     *  1. on category axis, like line, bar
     *  2. others, like scatter, pie
     * @param {module:echarts/model/Global} ecModel
     * @return {Object}
     */
    function groupSeries(ecModel) {
        var seriesGroupByCategoryAxis = {};
        var otherSeries = [];
        ecModel.eachRawSeries(function (seriesModel) {
            var coordSys = seriesModel.coordinateSystem;

            if (coordSys && (coordSys.type === 'cartesian2d' || coordSys.type === 'polar')) {
                var baseAxis = coordSys.getBaseAxis();
                if (baseAxis.type === 'category') {
                    var key = baseAxis.dim + '_' + baseAxis.index;
                    seriesGroupByCategoryAxis[key] = seriesGroupByCategoryAxis[key] || {
                        categoryAxis: baseAxis,
                        valueAxis: coordSys.getOtherAxis(baseAxis),
                        series: []
                    };
                    seriesGroupByCategoryAxis[key].series.push(seriesModel);
                }
            }
            else {
                otherSeries.push(seriesModel);
            }
        });
        return {
            seriesGroupByCategoryAxis: seriesGroupByCategoryAxis,
            other: otherSeries
        };
    }

    /**
     * Assemble content of series on cateogory axis
     * @param {Array.<module:echarts/model/Series>} series
     * @return {string}
     */
    function assembleSeriesWithCategoryAxis(series) {
        var tables = [];
        zrUtil.each(series, function (group, key) {
            var categoryAxis = group.categoryAxis;
            var valueAxis = group.valueAxis;
            var valueAxisDim = valueAxis.dim;

            var headers = ['类目'].concat(zrUtil.map(group.series, function (series) {
                return series.name;
            }));
            var columns = [categoryAxis.model.getCategories()];
            zrUtil.each(group.series, function (series) {
                columns.push(series.getData().mapArray(valueAxisDim, function (val) {
                    return val;
                }));
            });
            // Assemble table content
            var lines = [headers.join('\t')];
            for (var i = 0; i < columns[0].length; i++) {
                var items = [];
                for (var j = 0; j < columns.length; j++) {
                    items.push(columns[j][i]);
                }
                lines.push(items.join('\t'));
            }
            tables.push(lines.join('\n'));
        });
        return tables.join('\n\n\n');
    }

    /**
     * Assemble content of other series
     * @param {Array.<module:echarts/model/Series>} series
     * @return {string}
     */
    function assembleOtherSeries(series) {
        return zrUtil.map(series, function (series) {
            var data = series.getData();
            var lines = [series.name];
            data.each(data.dimensions, function () {
                var argLen = arguments.length;
                var dataIndex = arguments[argLen - 1];
                var vals = zrUtil.slice(arguments, 0, argLen - 1);
                var name = data.getName(dataIndex);
                if (name) {
                    vals.unshift(name);
                }
                lines.push(vals.join('\t'));
            });
            return lines.join('\n');
        }).join('\n\n\n');
    }

    /**
     * @param {module:echarts/model/Global}
     * @return {string}
     */
    function getContentFromModel(ecModel) {

        var result = groupSeries(ecModel);

        return [
            assembleSeriesWithCategoryAxis(result.seriesGroupByCategoryAxis),
            assembleOtherSeries(result.other)
        ].join('\n\n\n');
    }

    function DataView(model) {

        this._dom = null;

        this.model = model;
    }


    DataView.defaultOption = {
        show: true,
        readOnly: false,
        icon: 'M17.5,17.3H33 M17.5,17.3H33 M45.4,29.5h-28 M11.5,2v56H51V14.8L38.4,2H11.5z M38.4,2.2v12.7H51 M45.4,41.7h-28',
        title: '数据视图',
        lang: ['数据视图', '关闭', '刷新']
    };


    DataView.prototype.onclick = function (ecModel, api) {
        var container = api.getDom();
        var model = this.model;
        if (this._dom) {
            container.removeChild(this._dom);
        }
        var root = document.createElement('div');
        root.style.cssText = 'position:absolute;left:5;top:5;bottom:5;right:5;'
            + 'background-color: white';

        // Create elements
        var header = document.createElement('h4');
        var lang = model.get('lang') || [];
        header.innerHTML = lang[0] || model.get('title');
        header.style.cssText = 'margin: 10px 20px;';
        var textarea = document.createElement('textarea');
        textarea.style.cssText = 'display:block;width:100%;font-size:14px;line-height:1.6rem;font-family:Monaco,Consolas,Courier New';
        textarea.textContent = getContentFromModel(ecModel);

        var buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'position:absolute;bottom:0;left:0;right:0;';

        var buttonStyle = 'float:right;margin-right:20px;border:none;background:#c23531;'
            + 'cursor:pointer;padding:4px 8px;color:#fff;font-size:12px;border-radius:3px;';
        var closeButton = document.createElement('div');
        var refreshButton = document.createElement('div');

        var self = this;
        eventTool.addEventListener(closeButton, 'click', function () {
            container.removeChild(root);
            self._dom = null;
        });

        closeButton.innerHTML = lang[1];
        refreshButton.innerHTML = lang[2];
        refreshButton.style.cssText = buttonStyle;
        closeButton.style.cssText = buttonStyle;

        buttonContainer.appendChild(refreshButton);
        buttonContainer.appendChild(closeButton);

        // http://stackoverflow.com/questions/6637341/use-tab-to-indent-in-textarea
        eventTool.addEventListener(textarea, 'keydown', function (e) {
            if ((e.keyCode || e.which) === 9) {
                // get caret position/selection
                var val = this.value;
                var start = this.selectionStart;
                var end = this.selectionEnd;

                // set textarea value to: text before caret + tab + text after caret
                this.value = val.substring(0, start) + '\t' + val.substring(end);

                // put caret at right position again
                this.selectionStart = this.selectionEnd = start + 1;

                // prevent the focus lose
                eventTool.stop(e);
            }
        });

        root.appendChild(header);
        root.appendChild(textarea);
        root.appendChild(buttonContainer);

        textarea.style.height = (container.clientHeight - 100) + 'px';

        container.appendChild(root);
        this._dom = root;
    };

    DataView.prototype.dispose = function (ecModel, api) {
        this._dom && api.getDom().removeChild(this._dom);
    };

    require('../featureManager').register('dataView', DataView);

    return DataView;
});