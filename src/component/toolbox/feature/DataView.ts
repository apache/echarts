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

import * as echarts from '../../../echarts';
import * as zrUtil from 'zrender/src/core/util';
import lang from '../../../lang';
import GlobalModel from '../../../model/Global';
import SeriesModel from '../../../model/Series';
import { ToolboxFeature, registerFeature, ToolboxFeatureOption } from '../featureManager';
import { ColorString, ECUnitOption, SeriesOption, Payload, Dictionary } from '../../../util/types';
import ExtensionAPI from '../../../ExtensionAPI';
import { addEventListener } from 'zrender/src/core/event';
import Axis from '../../../coord/Axis';
import Cartesian2D from '../../../coord/cartesian/Cartesian2D';

const dataViewLang = lang.toolbox.dataView;

const BLOCK_SPLITER = new Array(60).join('-');
const ITEM_SPLITER = '\t';

type DataItem = {
    name: string
    value: number[] | number
};

type DataList = (DataItem | number | number[])[];

interface ChangeDataViewPayload extends Payload {
    newOption: {
        series: SeriesOption[]
    }
}

interface SeriesGroupMeta {
    axisDim: string
    axisIndex: number
}

interface SeriesGroup {
    series: SeriesModel[]
    categoryAxis: Axis
    valueAxis: Axis
}

/**
 * Group series into two types
 *  1. on category axis, like line, bar
 *  2. others, like scatter, pie
 */
function groupSeries(ecModel: GlobalModel) {
    let seriesGroupByCategoryAxis: Dictionary<SeriesGroup> = {};
    let otherSeries: SeriesModel[] = [];
    let meta: SeriesGroupMeta[] = [];
    ecModel.eachRawSeries(function (seriesModel) {
        let coordSys = seriesModel.coordinateSystem;

        if (coordSys && (coordSys.type === 'cartesian2d' || coordSys.type === 'polar')) {
            // TODO: TYPE Consider polar? Include polar may increase unecessary bundle size.
            let baseAxis = (coordSys as Cartesian2D).getBaseAxis();
            if (baseAxis.type === 'category') {
                let key = baseAxis.dim + '_' + baseAxis.index;
                if (!seriesGroupByCategoryAxis[key]) {
                    seriesGroupByCategoryAxis[key] = {
                        categoryAxis: baseAxis,
                        valueAxis: coordSys.getOtherAxis(baseAxis),
                        series: []
                    };
                    meta.push({
                        axisDim: baseAxis.dim,
                        axisIndex: baseAxis.index
                    });
                }
                seriesGroupByCategoryAxis[key].series.push(seriesModel);
            }
            else {
                otherSeries.push(seriesModel);
            }
        }
        else {
            otherSeries.push(seriesModel);
        }
    });

    return {
        seriesGroupByCategoryAxis: seriesGroupByCategoryAxis,
        other: otherSeries,
        meta: meta
    };
}

/**
 * Assemble content of series on cateogory axis
 * @inner
 */
function assembleSeriesWithCategoryAxis(groups: Dictionary<SeriesGroup>): string {
    let tables: string[] = [];
    zrUtil.each(groups, function (group, key) {
        let categoryAxis = group.categoryAxis;
        let valueAxis = group.valueAxis;
        let valueAxisDim = valueAxis.dim;

        let headers = [' '].concat(zrUtil.map(group.series, function (series) {
            return series.name;
        }));
        // @ts-ignore TODO Polar
        let columns = [categoryAxis.model.getCategories()];
        zrUtil.each(group.series, function (series) {
            columns.push(series.getRawData().mapArray(valueAxisDim, function (val) {
                return val;
            }));
        });
        // Assemble table content
        let lines = [headers.join(ITEM_SPLITER)];
        for (let i = 0; i < columns[0].length; i++) {
            let items = [];
            for (let j = 0; j < columns.length; j++) {
                items.push(columns[j][i]);
            }
            lines.push(items.join(ITEM_SPLITER));
        }
        tables.push(lines.join('\n'));
    });
    return tables.join('\n\n' + BLOCK_SPLITER + '\n\n');
}

/**
 * Assemble content of other series
 */
function assembleOtherSeries(series: SeriesModel[]) {
    return zrUtil.map(series, function (series) {
        let data = series.getRawData();
        let lines = [series.name];
        let vals: string[] = [];
        data.each(data.dimensions, function () {
            let argLen = arguments.length;
            let dataIndex = arguments[argLen - 1];
            let name = data.getName(dataIndex);
            for (let i = 0; i < argLen - 1; i++) {
                vals[i] = arguments[i];
            }
            lines.push((name ? (name + ITEM_SPLITER) : '') + vals.join(ITEM_SPLITER));
        });
        return lines.join('\n');
    }).join('\n\n' + BLOCK_SPLITER + '\n\n');
}

function getContentFromModel(ecModel: GlobalModel) {

    let result = groupSeries(ecModel);

    return {
        value: zrUtil.filter([
                assembleSeriesWithCategoryAxis(result.seriesGroupByCategoryAxis),
                assembleOtherSeries(result.other)
            ], function (str) {
                return !!str.replace(/[\n\t\s]/g, '');
            }).join('\n\n' + BLOCK_SPLITER + '\n\n'),

        meta: result.meta
    };
}


function trim(str: string) {
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}
/**
 * If a block is tsv format
 */
function isTSVFormat(block: string): boolean {
    // Simple method to find out if a block is tsv format
    let firstLine = block.slice(0, block.indexOf('\n'));
    if (firstLine.indexOf(ITEM_SPLITER) >= 0) {
        return true;
    }
}

const itemSplitRegex = new RegExp('[' + ITEM_SPLITER + ']+', 'g');
/**
 * @param {string} tsv
 * @return {Object}
 */
function parseTSVContents(tsv: string) {
    let tsvLines = tsv.split(/\n+/g);
    let headers = trim(tsvLines.shift()).split(itemSplitRegex);

    let categories: string[] = [];
    let series: {name: string, data: string[]}[] = zrUtil.map(headers, function (header) {
        return {
            name: header,
            data: []
        };
    });
    for (let i = 0; i < tsvLines.length; i++) {
        let items = trim(tsvLines[i]).split(itemSplitRegex);
        categories.push(items.shift());
        for (let j = 0; j < items.length; j++) {
            series[j] && (series[j].data[i] = items[j]);
        }
    }
    return {
        series: series,
        categories: categories
    };
}

function parseListContents(str: string) {
    let lines = str.split(/\n+/g);
    let seriesName = trim(lines.shift());

    let data: DataList = [];
    for (let i = 0; i < lines.length; i++) {
        let items = trim(lines[i]).split(itemSplitRegex);
        let name = '';
        let value: number[];
        let hasName = false;
        if (isNaN(items[0] as unknown as number)) { // First item is name
            hasName = true;
            name = items[0];
            items = items.slice(1);
            data[i] = {
                name: name,
                value: []
            };
            value = (data[i] as DataItem).value as number[];
        }
        else {
            value = data[i] = [];
        }
        for (let j = 0; j < items.length; j++) {
            value.push(+items[j]);
        }
        if (value.length === 1) {
            hasName ? ((data[i] as DataItem).value = value[0]) : (data[i] = value[0]);
        }
    }

    return {
        name: seriesName,
        data: data
    };
}

function parseContents(str: string, blockMetaList: SeriesGroupMeta[]) {
    let blocks = str.split(new RegExp('\n*' + BLOCK_SPLITER + '\n*', 'g'));
    let newOption: ECUnitOption = {
        series: []
    };
    zrUtil.each(blocks, function (block, idx) {
        if (isTSVFormat(block)) {
            const result = parseTSVContents(block);
            const blockMeta = blockMetaList[idx];
            const axisKey = blockMeta.axisDim + 'Axis';

            if (blockMeta) {
                newOption[axisKey] = newOption[axisKey] || [];
                newOption[axisKey][blockMeta.axisIndex] = {
                    data: result.categories
                };
                newOption.series = newOption.series.concat(result.series);
            }
        }
        else {
            const result = parseListContents(block);
            newOption.series.push(result);
        }
    });
    return newOption;
}

interface ToolboxDataViewFeatureOption extends ToolboxFeatureOption {
    readOnly?: boolean

    optionToContent?: (option: ECUnitOption) => string | HTMLElement
    contentToOption?: (viewMain: HTMLDivElement, oldOption: ECUnitOption) => ECUnitOption

    icon?: string
    title?: string
    lang?: string[]

    backgroundColor?: ColorString

    textColor?: ColorString
    textareaColor?: ColorString
    textareaBorderColor?: ColorString

    buttonColor?: ColorString
    buttonTextColor?: ColorString
}

class DataView extends ToolboxFeature<ToolboxDataViewFeatureOption> {

    private _dom: HTMLDivElement;

    onclick(ecModel: GlobalModel, api: ExtensionAPI) {
        let container = api.getDom();
        let model = this.model;
        if (this._dom) {
            container.removeChild(this._dom);
        }
        let root = document.createElement('div');
        root.style.cssText = 'position:absolute;left:5px;top:5px;bottom:5px;right:5px;';
        root.style.backgroundColor = model.get('backgroundColor') || '#fff';

        // Create elements
        let header = document.createElement('h4');
        let lang = model.get('lang') || [];
        header.innerHTML = lang[0] || model.get('title');
        header.style.cssText = 'margin: 10px 20px;';
        header.style.color = model.get('textColor');

        let viewMain = document.createElement('div');
        let textarea = document.createElement('textarea');
        viewMain.style.cssText = 'display:block;width:100%;overflow:auto;';

        let optionToContent = model.get('optionToContent');
        let contentToOption = model.get('contentToOption');
        let result = getContentFromModel(ecModel);
        if (typeof optionToContent === 'function') {
            let htmlOrDom = optionToContent(api.getOption());
            if (typeof htmlOrDom === 'string') {
                viewMain.innerHTML = htmlOrDom;
            }
            else if (zrUtil.isDom(htmlOrDom)) {
                viewMain.appendChild(htmlOrDom);
            }
        }
        else {
            // Use default textarea
            viewMain.appendChild(textarea);
            textarea.readOnly = model.get('readOnly');
            textarea.style.cssText = 'width:100%;height:100%;font-family:monospace;font-size:14px;line-height:1.6rem;';
            textarea.style.color = model.get('textColor');
            textarea.style.borderColor = model.get('textareaBorderColor');
            textarea.style.backgroundColor = model.get('textareaColor');
            textarea.value = result.value;
        }

        let blockMetaList = result.meta;

        let buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'position:absolute;bottom:0;left:0;right:0;';

        let buttonStyle = 'float:right;margin-right:20px;border:none;'
            + 'cursor:pointer;padding:2px 5px;font-size:12px;border-radius:3px';
        let closeButton = document.createElement('div');
        let refreshButton = document.createElement('div');

        buttonStyle += ';background-color:' + model.get('buttonColor');
        buttonStyle += ';color:' + model.get('buttonTextColor');

        let self = this;

        function close() {
            container.removeChild(root);
            self._dom = null;
        }
        addEventListener(closeButton, 'click', close);

        addEventListener(refreshButton, 'click', function () {
            let newOption;
            try {
                if (typeof contentToOption === 'function') {
                    newOption = contentToOption(viewMain, api.getOption());
                }
                else {
                    newOption = parseContents(textarea.value, blockMetaList);
                }
            }
            catch (e) {
                close();
                throw new Error('Data view format error ' + e);
            }
            if (newOption) {
                api.dispatchAction({
                    type: 'changeDataView',
                    newOption: newOption
                });
            }

            close();
        });

        closeButton.innerHTML = lang[1];
        refreshButton.innerHTML = lang[2];
        refreshButton.style.cssText = buttonStyle;
        closeButton.style.cssText = buttonStyle;

        !model.get('readOnly') && buttonContainer.appendChild(refreshButton);
        buttonContainer.appendChild(closeButton);

        root.appendChild(header);
        root.appendChild(viewMain);
        root.appendChild(buttonContainer);

        viewMain.style.height = (container.clientHeight - 80) + 'px';

        container.appendChild(root);
        this._dom = root;
    }

    remove(ecModel: GlobalModel, api: ExtensionAPI) {
        this._dom && api.getDom().removeChild(this._dom);
    }

    dispose(ecModel: GlobalModel, api: ExtensionAPI) {
        this.remove(ecModel, api);
    }

    static defaultOption: ToolboxDataViewFeatureOption = {
        show: true,
        readOnly: false,
        optionToContent: null,
        contentToOption: null,

        // eslint-disable-next-line
        icon: 'M17.5,17.3H33 M17.5,17.3H33 M45.4,29.5h-28 M11.5,2v56H51V14.8L38.4,2H11.5z M38.4,2.2v12.7H51 M45.4,41.7h-28',
        title: zrUtil.clone(dataViewLang.title),
        lang: zrUtil.clone(dataViewLang.lang),
        backgroundColor: '#fff',
        textColor: '#000',
        textareaColor: '#fff',
        textareaBorderColor: '#333',
        buttonColor: '#c23531',
        buttonTextColor: '#fff'
    };
}

/**
 * @inner
 */
function tryMergeDataOption(newData: DataList, originalData: DataList) {
    return zrUtil.map(newData, function (newVal, idx) {
        let original = originalData && originalData[idx];
        if (zrUtil.isObject(original) && !zrUtil.isArray(original)) {
            if (zrUtil.isObject(newVal) && !zrUtil.isArray(newVal)) {
                newVal = newVal.value;
            }
            // Original data has option
            return zrUtil.defaults({
                value: newVal
            }, original);
        }
        else {
            return newVal;
        }
    });
}

registerFeature('dataView', DataView);

echarts.registerAction({
    type: 'changeDataView',
    event: 'dataViewChanged',
    update: 'prepareAndUpdate'
}, function (payload: ChangeDataViewPayload, ecModel: GlobalModel) {
    let newSeriesOptList: SeriesOption[] = [];
    zrUtil.each(payload.newOption.series, function (seriesOpt) {
        let seriesModel = ecModel.getSeriesByName(seriesOpt.name)[0];
        if (!seriesModel) {
            // New created series
            // Geuss the series type
            newSeriesOptList.push(zrUtil.extend({
                // Default is scatter
                type: 'scatter'
            }, seriesOpt));
        }
        else {
            let originalData = seriesModel.get('data');
            newSeriesOptList.push({
                name: seriesOpt.name,
                data: tryMergeDataOption(seriesOpt.data, originalData)
            });
        }
    });

    ecModel.mergeOption(zrUtil.defaults({
        series: newSeriesOptList
    }, payload.newOption));
});

export default DataView;