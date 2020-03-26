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

// @ts-nocheck

import * as zrUtil from 'zrender/src/core/util';
import lang from '../lang';
import { retrieveRawValue } from '../data/helper/dataProvider';

export default function (dom, ecModel) {
    const ariaModel = ecModel.getModel('aria');
    if (!ariaModel.get('show')) {
        return;
    }
    else if (ariaModel.get('description')) {
        dom.setAttribute('aria-label', ariaModel.get('description'));
        return;
    }

    let seriesCnt = 0;
    ecModel.eachSeries(function (seriesModel, idx) {
        ++seriesCnt;
    }, this);

    const maxDataCnt = ariaModel.get('data.maxCount') || 10;
    const maxSeriesCnt = ariaModel.get('series.maxCount') || 10;
    const displaySeriesCnt = Math.min(seriesCnt, maxSeriesCnt);

    let ariaLabel;
    if (seriesCnt < 1) {
        // No series, no aria label
        return;
    }
    else {
        const title = getTitle();
        if (title) {
            ariaLabel = replace(getConfig('general.withTitle'), {
                title: title
            });
        }
        else {
            ariaLabel = getConfig('general.withoutTitle');
        }

        const seriesLabels = [];
        const prefix = seriesCnt > 1
            ? 'series.multiple.prefix'
            : 'series.single.prefix';
        ariaLabel += replace(getConfig(prefix), { seriesCount: seriesCnt });

        ecModel.eachSeries(function (seriesModel, idx) {
            if (idx < displaySeriesCnt) {
                let seriesLabel;

                const seriesName = seriesModel.get('name');
                const seriesTpl = 'series.'
                    + (seriesCnt > 1 ? 'multiple' : 'single') + '.';
                seriesLabel = getConfig(seriesName
                    ? seriesTpl + 'withName'
                    : seriesTpl + 'withoutName');

                seriesLabel = replace(seriesLabel, {
                    seriesId: seriesModel.seriesIndex,
                    seriesName: seriesModel.get('name'),
                    seriesType: getSeriesTypeName(seriesModel.subType)
                });

                const data = seriesModel.getData();
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

                const dataLabels = [];
                for (let i = 0; i < data.count(); i++) {
                    if (i < maxDataCnt) {
                        const name = data.getName(i);
                        const value = retrieveRawValue(data, i);
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

        let result = str;
        zrUtil.each(keyValues, function (value, key) {
            result = result.replace(
                new RegExp('\\{\\s*' + key + '\\s*\\}', 'g'),
                value
            );
        });
        return result;
    }

    function getConfig(path) {
        const userConfig = ariaModel.get(path);
        if (userConfig == null) {
            const pathArr = path.split('.');
            let result = lang.aria;
            for (let i = 0; i < pathArr.length; ++i) {
                result = result[pathArr[i]];
            }
            return result;
        }
        else {
            return userConfig;
        }
    }

    function getTitle() {
        let title = ecModel.getModel('title').option;
        if (title && title.length) {
            title = title[0];
        }
        return title && title.text;
    }

    function getSeriesTypeName(type) {
        return lang.series.typeNames[type] || '自定义图';
    }
}
