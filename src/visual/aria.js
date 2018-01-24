import * as zrUtil from 'zrender/src/core/util';
import lang from '../lang';
import { retrieveRawValue } from '../data/helper/dataProvider';

export default function (dom, ecModel) {
    var ariaModel = ecModel.getModel('aria');
    if (!ariaModel.get('show')) {
        return;
    }
    else if (ariaModel.get('description')) {
        dom.setAttribute('aria-label', ariaModel.get('description'));
        return;
    }

    var seriesCnt = 0;
    ecModel.eachSeries(function (seriesModel, idx) {
        ++seriesCnt;
    }, this);

    var maxDataCnt = ariaModel.get('data.maxCount') || 10;
    var maxSeriesCnt = ariaModel.get('series.maxCount') || 10;
    var displaySeriesCnt = Math.min(seriesCnt, maxSeriesCnt);

    var ariaLabel;
    if (seriesCnt < 1) {
        // No series, no aria label
        return;
    }
    else {
        var title = getTitle();
        if (title) {
            ariaLabel = replace(getConfig('general.withTitle'), {
                title: title
            });
        }
        else {
            ariaLabel = getConfig('general.withoutTitle');
        }

        var seriesLabels = [];
        var prefix = seriesCnt > 1
            ? 'series.multiple.prefix'
            : 'series.single.prefix';
        ariaLabel += replace(getConfig(prefix), { seriesCount: seriesCnt });

        ecModel.eachSeries(function (seriesModel, idx) {
            if (idx < displaySeriesCnt) {
                var seriesLabel;

                var seriesName = seriesModel.get('name');
                var seriesTpl = 'series.'
                    + (seriesCnt > 1 ? 'multiple' : 'single') + '.';
                seriesLabel = getConfig(seriesName
                    ? seriesTpl + 'withName'
                    : seriesTpl + 'withoutName');

                seriesLabel = replace(seriesLabel, {
                    seriesId: seriesModel.seriesIndex,
                    seriesName: seriesModel.get('name'),
                    seriesType: getSeriesTypeName(seriesModel.subType)
                });

                var data = seriesModel.getData();
                window.data = data;
                if (data.count() > maxDataCnt) {
                    // Show part of data
                    seriesLabel += replace(getConfig('data.partialData'), {
                        displayCnt: maxDataCnt
                    });
                }
                else {
                    seriesLabel += getConfig('data.allData');
                }

                var dataLabels = [];
                for (var i = 0; i < data.count(); i++) {
                    if (i < maxDataCnt) {
                        var name = data.getName(i);
                        var value = retrieveRawValue(data, i);
                        dataLabels.push(
                            replace(
                                name
                                    ? getConfig('data.withName')
                                    : getConfig('data.withoutName'),
                                {
                                    name: name,
                                    value: value
                                }
                            )
                        );
                    }
                }
                seriesLabel += dataLabels
                    .join(getConfig('data.separator.middle'))
                    + getConfig('data.separator.end');

                seriesLabels.push(seriesLabel);
            }
        });

        ariaLabel += seriesLabels
            .join(getConfig('series.multiple.separator.middle'))
            + getConfig('series.multiple.separator.end');

        dom.setAttribute('aria-label', ariaLabel);
    }

    function replace(str, keyValues) {
        if (typeof str !== 'string') {
            return str;
        }

        var result = str;
        zrUtil.each(keyValues, function (value, key) {
            result = result.replace(
                new RegExp('\\{\\s*' + key + '\\s*\\}', 'g'),
                value
            );
        });
        return result;
    }

    function getConfig(path) {
        var userConfig = ariaModel.get(path);
        if (userConfig == null) {
            var pathArr = path.split('.');
            var result = lang.aria;
            for (var i = 0; i < pathArr.length; ++i) {
                result = result[pathArr[i]];
            }
            return result;
        }
        else {
            return userConfig;
        }
    }

    function getTitle() {
        var title = ecModel.getModel('title').option;
        if (title && title.length) {
            title = title[0];
        }
        return title && title.text;
    }

    function getSeriesTypeName(type) {
        return lang.series.typeNames[type] || '自定义图';
    }
}
