import * as zrUtil from 'zrender/src/core/util';

export default function (dom, ecModel) {
    var ariaModel = ecModel.getModel('aria');
    if (!ariaModel.get('show')) {
        return;
    }

    var series = [];
    ecModel.eachSeries(function (seriesModel, idx) {
        var type = seriesModel.type.substr('series.'.length);
        series.push({
            type: type,
            desc: getSeriesDesc(type, seriesModel)
        });
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

        if (series.length === 1) {
            ariaLabel += getSeriesTypeName(series[0].type);
        }
        else {
            ariaLabel += '图表，它由' + series.length + '个图表系列组成。';
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
            default:
                return '图';
        }
    }

    function getSeriesDesc(type, seriesModel) {
        var data = seriesModel.getData();
        var dataCnt = data.indices.length;
        var seriesName = seriesModel.get('name');

        var desc = (seriesName ? '表示' + seriesName + '的' : '')
            + getSeriesTypeName(type) + '，包括' + dataCnt + '个数据项——';

        switch (type) {
            case 'pie':
                data.each('value', function (value, id) {
                    var percent = seriesModel.getDataParams(id).percent;

                    desc += data.getName(id) + '的数据是' + value
                        + '，占' + percent + '%';

                    if (id < dataCnt - 1) {
                        desc += '；';
                    }
                    else {
                        desc += '。';
                    }
                });
                break;

            case 'line':
            case 'bar':
                var baseAxis = seriesModel.getBaseAxis();
                var labels = baseAxis.scale.getTicksLabels();

                zrUtil.each(data.indices, function (id, i) {
                    desc += labels[id] + '：' + seriesModel.getRawValue(id);

                    if (i < data.indices.length - 1) {
                        desc += '、';
                    }
                    else {
                        desc += '。';
                    }
                });

                break;
        }

        return desc;
    }
}
