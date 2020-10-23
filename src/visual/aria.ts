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

import * as zrUtil from 'zrender/src/core/util';
import ExtensionAPI from '../ExtensionAPI';
import {retrieveRawValue} from '../data/helper/dataProvider';
import GlobalModel from '../model/Global';
import Model from '../model/Model';
import {AriaOption} from '../component/aria';
import {TitleOption} from '../component/title';
import {Dictionary} from '../util/types';
import {DecalObject} from 'zrender/src/graphic/Decal';
import { LocaleOption } from '../locale';

const defaultOption: AriaOption = {
    enabled: true,
    label: {
        enabled: true
    },
    decal: {
        show: false
    }
};

const decalPaletteScope: Dictionary<DecalObject> = {};

type SeriesTypes = keyof LocaleOption['series']['typeNames'];

export default function (ecModel: GlobalModel, api: ExtensionAPI) {
    const ariaModel: Model<AriaOption> = ecModel.getModel('aria');

    if (ariaModel.option) {
        const labelLocale = ecModel.getLocaleModel().get('aria');
        defaultOption.label = zrUtil.defaults(labelLocale, defaultOption.label);
        ariaModel.option = zrUtil.defaults(ariaModel.option, defaultOption);
    }
    if (!ariaModel.get('enabled')) {
        return;
    }

    setDecal();
    setLabel();

    function setDecal() {
        const decalModel = ariaModel.getModel('decal');

        const useDecal = decalModel.get('show');
        if (useDecal) {
            // default decal show value is true
            ecModel.eachRawSeries(seriesModel => {
                if (typeof seriesModel.enableAriaDecal === 'function') {
                    // Let series define how to use decal palette on data
                    seriesModel.enableAriaDecal();
                    return;
                }

                const data = seriesModel.getData();

                if (seriesModel.useColorPaletteOnData) {
                    const decalSeriesScope: Dictionary<DecalObject> = {};
                    const dataCount = data.count();
                    data.each(idx => {
                        const itemStyle = data.ensureUniqueItemVisual(idx, 'style');
                        const name = data.getName(idx) || (idx + '');
                        const paletteDecal = seriesModel.getDecalFromPalette(
                            name,
                            decalSeriesScope,
                            dataCount
                        );
                        const decal = zrUtil.defaults(
                            itemStyle.decal || {},
                            paletteDecal
                        );
                        data.setItemVisual(idx, 'decal', decal);
                    });
                }
                else {
                    const style = data.getVisual('style');
                    const paletteDecal = seriesModel.getDecalFromPalette(
                        seriesModel.name,
                        decalPaletteScope,
                        ecModel.getSeriesCount()
                    );
                    const decal = style.decal
                        ? zrUtil.defaults(style.decal, paletteDecal)
                        : paletteDecal;
                    decal.dirty = true;
                    data.setVisual('decal', decal);
                }
            });
        }
    }

    function setLabel() {
        const labelLocale = ecModel.getLocaleModel().get('aria');
        const labelModel = ariaModel.getModel('label');
        labelModel.option = zrUtil.defaults(labelModel.option, labelLocale);

        if (!labelModel.get('enabled')) {
            return;
        }

        const dom = api.getZr().dom;
        if (labelModel.get('description')) {
            dom.setAttribute('aria-label', labelModel.get('description'));
            return;
        }

        const seriesCnt = ecModel.getSeriesCount();
        const maxDataCnt = labelModel.get(['data', 'maxCount']) || 10;
        const maxSeriesCnt = labelModel.get(['series', 'maxCount']) || 10;
        const displaySeriesCnt = Math.min(seriesCnt, maxSeriesCnt);

        let ariaLabel;
        if (seriesCnt < 1) {
            // No series, no aria label
            return;
        }
        else {
            const title = getTitle();
            if (title) {
                const withTitle = labelModel.get(['general', 'withTitle']);
                ariaLabel = replace(withTitle, {
                    title: title
                });
            }
            else {
                ariaLabel = labelModel.get(['general', 'withoutTitle']);
            }

            const seriesLabels: string[] = [];
            const prefix = seriesCnt > 1
                ? labelModel.get(['series', 'multiple', 'prefix'])
                : labelModel.get(['series', 'single', 'prefix']);
            ariaLabel += replace(prefix, { seriesCount: seriesCnt });

            ecModel.eachSeries(function (seriesModel, idx) {
                if (idx < displaySeriesCnt) {
                    let seriesLabel;

                    const seriesName = seriesModel.get('name');
                    const withName = seriesName ? 'withName' : 'withoutName';
                    seriesLabel = seriesCnt > 1
                        ? labelModel.get(['series', 'multiple', withName])
                        : labelModel.get(['series', 'single', withName]);

                    seriesLabel = replace(seriesLabel, {
                        seriesId: seriesModel.seriesIndex,
                        seriesName: seriesModel.get('name'),
                        seriesType: getSeriesTypeName(seriesModel.subType as SeriesTypes)
                    });

                    const data = seriesModel.getData();
                    if (data.count() > maxDataCnt) {
                        // Show part of data
                        const partialLabel = labelModel.get(['data', 'partialData']);
                        seriesLabel += replace(partialLabel, {
                            displayCnt: maxDataCnt
                        });
                    }
                    else {
                        seriesLabel += labelModel.get(['data', 'allData']);
                    }

                    const dataLabels = [];
                    for (let i = 0; i < data.count(); i++) {
                        if (i < maxDataCnt) {
                            const name = data.getName(i);
                            const value = retrieveRawValue(data, i);
                            const dataLabel = labelModel.get(['data', name ? 'withName' : 'withoutName']);
                            dataLabels.push(
                                replace(dataLabel, {
                                    name: name,
                                    value: value
                                })
                            );
                        }
                    }
                    const middleSeparator = labelModel.get(['data', 'separator', 'middle']);
                    const endSeparator = labelModel.get(['data', 'separator', 'end']);
                    seriesLabel += dataLabels.join(middleSeparator) + endSeparator;

                    seriesLabels.push(seriesLabel);
                }
            });

            const separatorModel = labelModel.getModel(['series', 'multiple', 'separator']);
            const middleSeparator = separatorModel.get('middle');
            const endSeparator = separatorModel.get('end');
            ariaLabel += seriesLabels.join(middleSeparator) + endSeparator;

            dom.setAttribute('aria-label', ariaLabel);
        }
    }

    function replace(str: string, keyValues: object) {
        if (typeof str !== 'string') {
            return str;
        }

        let result = str;
        zrUtil.each(keyValues, function (value: string, key: string) {
            result = result.replace(
                new RegExp('\\{\\s*' + key + '\\s*\\}', 'g'),
                value
            );
        });
        return result;
    }

    function getTitle() {
        let title = ecModel.get('title') as TitleOption | TitleOption[];
        if (title && (title as TitleOption[]).length) {
            title = (title as TitleOption[])[0];
        }
        return title && (title as TitleOption).text;
    }

    function getSeriesTypeName(type: SeriesTypes) {
        return ecModel.getLocaleModel().get(['series', 'typeNames'])[type] || '自定义图';
    }
}
