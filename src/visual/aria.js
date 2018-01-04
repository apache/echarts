import * as zrUtil from 'zrender/src/core/util';

export default function (dom, ecModel) {
    var ariaModel = ecModel.getModel('aria');
    if (!ariaModel.get('show')) {
        return;
    }
    else if (ariaModel.get('desc')) {
        dom.setAttribute('aria-label', ariaModel.get('desc'));
        return;
    }

    var maxDataCnt = ariaModel.get('maxDataCnt') || 10;
    var maxSeriesCnt = ariaModel.get('maxSeriesCnt') || 10;

    var series = [];
    var seriesCnt = 0;
    ecModel.eachSeries(function (seriesModel, idx) {
        if (idx < maxSeriesCnt) {
            var type = ariaModel.get('renderAs')
                || seriesModel.type.substr('series.'.length);
            series.push({
                type: type,
                desc: getSeriesDesc(type, seriesModel)
            });
        }
        ++seriesCnt;
    }, this);

    var ariaLabel;
    if (series.length < 1) {
        // No series, no aria label
        return;
    }
    else {
        ariaLabel = '这是一个';

        var title = getTitle();
        if (title) {
            ariaLabel += '关于“' + title + '”的';
        }

        if (series.length > 1) {
            ariaLabel += '图表，它由' + seriesCnt + '个图表系列组成。';
        }

        zrUtil.each(series, function (s, id) {
            if (series.length > 1) {
                ariaLabel += '第' + (id + 1) + '个系列是一个';
            }
            ariaLabel += s.desc;
        });

        dom.setAttribute('aria-label', ariaLabel);
    }

    function getTitle() {
        var title = ecModel.getModel('title').option;
        if (title && title.length) {
            title = title[0];
        }
        return title && title.text;
    }

    function getSeriesTypeName(type) {
        switch (type) {
            case 'pie':
                return '饼图';
            case 'bar':
                return '柱状图';
            case 'line':
                return '折线图';
            case 'scatter':
            case 'effectScatter':
                return '散点图';
            case 'radar':
                return '雷达图';
            case 'tree':
                return '树图';
            case 'treemap':
                return '矩形树图';
            case 'boxplot':
                return '箱型图';
            case 'candlestick':
                return 'K线图';
            case 'heatmap':
                return '热力图';
            case 'map':
                return '地图';
            case 'parallel':
                return '平行坐标图';
            case 'lines':
                return '线图';
            case 'graph':
                return '关系图';
            case 'sankey':
                return '桑基图';
            case 'funnel':
                return '漏斗图';
            case 'gauge':
                return '仪表盘图';
            case 'pictorialBar':
                return '象形柱图';
            case 'themeRiver':
                return '主题河流图';
            default:
                return '图';
        }
    }

    function getSeriesDesc(type, seriesModel) {
        var data = seriesModel.getData();
        var dataCnt = data.indices ? data.indices.length : 0;
        var seriesName = seriesModel.get('name');
        var displayDataCnt = Math.min(dataCnt, maxDataCnt);

        var desc = (seriesName ? '表示' + seriesName + '的' : '')
            + getSeriesTypeName(type) + '，包括' + dataCnt + '个数据项。';

        var dataDesc = '';
        switch (type) {
            case 'pie':
                data.each('value', function (value, id) {
                    if (id < displayDataCnt) {
                        var percent = seriesModel.getDataParams(id).percent;

                        dataDesc += data.getName(id) + '的数据是' + value
                            + '，占' + percent + '%';

                        if (id < displayDataCnt - 1) {
                            dataDesc += '；';
                        }
                        else {
                            dataDesc += '。';
                        }
                    }
                });
                break;

            case 'line':
            case 'bar':
                var baseAxis = seriesModel.getBaseAxis();
                var labels = baseAxis.scale.getTicksLabels();

                zrUtil.each(data.indices, function (id, i) {
                    if (id < displayDataCnt) {
                        dataDesc += labels[id] + '：' + seriesModel.getRawValue(id);

                        if (i < displayDataCnt - 1) {
                            dataDesc += '、';
                        }
                        else {
                            dataDesc += '。';
                        }
                    }
                });
                break;

            case 'scatter':
            case 'effectScatter':
            case 'parallel':
                zrUtil.each(data.indices, function (id, i) {
                    if (id < displayDataCnt) {
                        dataDesc += '[' + seriesModel.getRawValue(id) + ']';

                        if (i < displayDataCnt - 1) {
                            dataDesc += '、';
                        }
                        else {
                            dataDesc += '。';
                        }
                    }
                });
                break;

            case 'radar':
            case 'gauge':
                var data = seriesModel.option.data;
                zrUtil.each(data, function (d, i) {
                    if (i < displayDataCnt) {
                        dataDesc += (d.name ? d.name + '：' : '') + d.value;

                        if (i < displayDataCnt - 1) {
                            dataDesc += '；';
                        }
                        else {
                            dataDesc += '。';
                        }
                    }
                });
                break;

            case 'tree':
            case 'treemap':
                var root = seriesModel.getData().tree.root;
                desc += '根节点';
                if (root.name) {
                    desc += '是' + root.name + '，';
                }
                desc += '包含' + root.children.length + '个数据。';
                break;

            case 'boxplot':
                var baseAxis = seriesModel.getBaseAxis();
                var labels = baseAxis.scale.getTicksLabels();

                zrUtil.each(data.indices, function (id, i) {
                    if (id < displayDataCnt) {
                        dataDesc += labels[id] + '：'
                            + seriesModel.getRawValue(id).join(', ');

                        if (i < displayDataCnt - 1) {
                            dataDesc += '、';
                        }
                        else {
                            dataDesc += '。';
                        }
                    }
                });
                break;

            case 'funnel':
                data.each('value', function (value, id) {
                    if (id < displayDataCnt) {
                        dataDesc += data.getName(id) + '的数据占' + value + '%';

                        if (id < displayDataCnt - 1) {
                            dataDesc += '；';
                        }
                        else {
                            dataDesc += '。';
                        }
                    }
                });
                break;
        }

        if (dataDesc) {
            if (dataCnt === displayDataCnt) {
                // Display all data
                desc += '其数据是——' + dataDesc;
            }
            else {
                // Display part of data
                desc += '其中，前' + displayDataCnt + '项是——' + dataDesc;
            }
        }

        return desc;
    }
}
