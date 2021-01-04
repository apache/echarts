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

import { DatasetModel } from '../../component/dataset/install';
import SeriesModel from '../../model/Series';
import { setAsPrimitive, map, isTypedArray, assert, each, retrieve2 } from 'zrender/src/core/util';
import { SourceMetaRawOption, Source, createSource, cloneSourceShallow } from '../Source';
import {
    SeriesEncodableModel, OptionSourceData,
    SOURCE_FORMAT_TYPED_ARRAY, SOURCE_FORMAT_ORIGINAL,
    SourceFormat, SeriesLayoutBy, OptionSourceHeader, DimensionDefinitionLoose
} from '../../util/types';
import {
    querySeriesUpstreamDatasetModel, queryDatasetUpstreamDatasetModels
} from './sourceHelper';
import { applyDataTransform } from './transform';


/**
 * [REQUIREMENT_MEMO]:
 * (0) `metaRawOption` means `dimensions`/`sourceHeader`/`seriesLayoutBy` in raw option.
 * (1) Keep support the feature: `metaRawOption` can be specified both on `series` and
 * `root-dataset`. Them on `series` has higher priority.
 * (2) Do not support to set `metaRawOption` on a `non-root-dataset`, because it might
 * confuse users: whether those props indicate how to visit the upstream source or visit
 * the transform result source, and some transforms has nothing to do with these props,
 * and some transforms might have multiple upstream.
 * (3) Transforms should specify `metaRawOption` in each output, just like they can be
 * declared in `root-dataset`.
 * (4) At present only support visit source in `SERIES_LAYOUT_BY_COLUMN` in transforms.
 * That is for reducing complexity in transfroms.
 * PENDING: Whether to provide transposition transform?
 *
 * [IMPLEMENTAION_MEMO]:
 * "sourceVisitConfig" are calculated from `metaRawOption` and `data`.
 * They will not be calculated until `source` is about to be visited (to prevent from
 * duplicate calcuation). `source` is visited only in series and input to transforms.
 *
 * [DIMENSION_INHERIT_RULE]:
 * By default the dimensions are inherited from ancestors, unless a transform return
 * a new dimensions definition.
 * Consider the case:
 * ```js
 * dataset: [{
 *     source: [ ['Product', 'Sales', 'Prise'], ['Cookies', 321, 44.21], ...]
 * }, {
 *     transform: { type: 'filter', ... }
 * }]
 * dataset: [{
 *     dimension: ['Product', 'Sales', 'Prise'],
 *     source: [ ['Cookies', 321, 44.21], ...]
 * }, {
 *     transform: { type: 'filter', ... }
 * }]
 * ```
 * The two types of option should have the same behavior after transform.
 *
 *
 * [SCENARIO]:
 * (1) Provide source data directly:
 * ```js
 * series: {
 *     encode: {...},
 *     dimensions: [...]
 *     seriesLayoutBy: 'row',
 *     data: [[...]]
 * }
 * ```
 * (2) Series refer to dataset.
 * ```js
 * series: [{
 *     encode: {...}
 *     // Ignore datasetIndex means `datasetIndex: 0`
 *     // and the dimensions defination in dataset is used
 * }, {
 *     encode: {...},
 *     seriesLayoutBy: 'column',
 *     datasetIndex: 1
 * }]
 * ```
 * (3) dataset transform
 * ```js
 * dataset: [{
 *     source: [...]
 * }, {
 *     source: [...]
 * }, {
 *     // By default from 0.
 *     transform: { type: 'filter', config: {...} }
 * }, {
 *     // Piped.
 *     transform: [
 *         { type: 'filter', config: {...} },
 *         { type: 'sort', config: {...} }
 *     ]
 * }, {
 *     id: 'regressionData',
 *     fromDatasetIndex: 1,
 *     // Third-party transform
 *     transform: { type: 'ecStat:regression', config: {...} }
 * }, {
 *     // retrieve the extra result.
 *     id: 'regressionFormula',
 *     fromDatasetId: 'regressionData',
 *     fromTransformResult: 1
 * }]
 * ```
 */

export class SourceManager {

    // Currently only datasetModel can host `transform`
    private _sourceHost: DatasetModel | SeriesModel;

    // Cached source. Do not repeat calculating if not dirty.
    private _sourceList: Source[] = [];

    // version sign of each upstream source manager.
    private _upstreamSignList: string[] = [];

    private _versionSignBase = 0;

    constructor(sourceHost: DatasetModel | SeriesModel) {
        this._sourceHost = sourceHost;
    }

    /**
     * Mark dirty.
     */
    dirty() {
        this._setLocalSource([], []);
    }

    private _setLocalSource(
        sourceList: Source[],
        upstreamSignList: string[]
    ): void {
        this._sourceList = sourceList;
        this._upstreamSignList = upstreamSignList;
        this._versionSignBase++;
        if (this._versionSignBase > 9e10) {
            this._versionSignBase = 0;
        }
    }

    /**
     * For detecting whether the upstream source is dirty, so that
     * the local cached source (in `_sourceList`) should be discarded.
     */
    private _getVersionSign(): string {
        return this._sourceHost.uid + '_' + this._versionSignBase;
    }

    /**
     * Always return a source instance. Otherwise throw error.
     */
    prepareSource(): void {
        // For the case that call `setOption` multiple time but no data changed,
        // cache the result source to prevent from repeating transform.
        if (this._isDirty()) {
            this._createSource();
        }
    }

    private _createSource(): void {
        this._setLocalSource([], []);
        const sourceHost = this._sourceHost;

        const upSourceMgrList = this._getUpstreamSourceManagers();
        const hasUpstream = !!upSourceMgrList.length;
        let resultSourceList: Source[];
        let upstreamSignList: string[];

        if (isSeries(sourceHost)) {
            const seriesModel = sourceHost as SeriesEncodableModel;
            let data;
            let sourceFormat: SourceFormat;
            let upSource: Source;

            // Has upstream dataset
            if (hasUpstream) {
                const upSourceMgr = upSourceMgrList[0];
                upSourceMgr.prepareSource();
                upSource = upSourceMgr.getSource();
                data = upSource.data;
                sourceFormat = upSource.sourceFormat;
                upstreamSignList = [upSourceMgr._getVersionSign()];
            }
            // Series data is from own.
            else {
                data = seriesModel.get('data', true) as OptionSourceData;
                sourceFormat = isTypedArray(data)
                    ? SOURCE_FORMAT_TYPED_ARRAY : SOURCE_FORMAT_ORIGINAL;
                upstreamSignList = [];
            }

            // See [REQUIREMENT_MEMO], merge settings on series and parent dataset if it is root.
            const newMetaRawOption = this._getSourceMetaRawOption();
            const upMetaRawOption = upSource ? upSource.metaRawOption : null;
            const seriesLayoutBy = retrieve2(
                newMetaRawOption.seriesLayoutBy,
                upMetaRawOption ? upMetaRawOption.seriesLayoutBy : null
            );
            const sourceHeader = retrieve2(
                newMetaRawOption.sourceHeader,
                upMetaRawOption ? upMetaRawOption.sourceHeader : null
            );
            // Note here we should not use `upSource.dimensionsDefine`. Consider the case:
            // `upSource.dimensionsDefine` is detected by `seriesLayoutBy: 'column'`,
            // but series need `seriesLayoutBy: 'row'`.
            const dimensions = retrieve2(
                newMetaRawOption.dimensions,
                upMetaRawOption ? upMetaRawOption.dimensions : null
            );

            resultSourceList = [createSource(
                data,
                { seriesLayoutBy, sourceHeader, dimensions },
                sourceFormat,
                seriesModel.get('encode', true)
            )];
        }
        else {
            const datasetModel = sourceHost as DatasetModel;

            // Has upstream dataset.
            if (hasUpstream) {
                const result = this._applyTransform(upSourceMgrList);
                resultSourceList = result.sourceList;
                upstreamSignList = result.upstreamSignList;
            }
            // Is root dataset.
            else {
                const sourceData = datasetModel.get('source', true);
                resultSourceList = [createSource(
                    sourceData,
                    this._getSourceMetaRawOption(),
                    null,
                    // Note: dataset option does not have `encode`.
                    null
                )];
                upstreamSignList = [];
            }
        }

        if (__DEV__) {
            assert(resultSourceList && upstreamSignList);
        }

        this._setLocalSource(resultSourceList, upstreamSignList);
    }

    private _applyTransform(
        upMgrList: SourceManager[]
    ): {
        sourceList: Source[],
        upstreamSignList: string[]
    } {
        const datasetModel = this._sourceHost as DatasetModel;
        const transformOption = datasetModel.get('transform', true);
        const fromTransformResult = datasetModel.get('fromTransformResult', true);

        if (__DEV__) {
            assert(fromTransformResult != null || transformOption != null);
        }

        if (fromTransformResult != null) {
            let errMsg = '';
            if (upMgrList.length !== 1) {
                if (__DEV__) {
                    errMsg = 'When using `fromTransformResult`, there should be only one upstream dataset';
                }
                doThrow(errMsg);
            }
        }

        let sourceList: Source[];
        const upSourceList: Source[] = [];
        const upstreamSignList: string[] = [];
        each(upMgrList, upMgr => {
            upMgr.prepareSource();
            const upSource = upMgr.getSource(fromTransformResult || 0);
            let errMsg = '';
            if (fromTransformResult != null && !upSource) {
                if (__DEV__) {
                    errMsg = 'Can not retrieve result by `fromTransformResult`: ' + fromTransformResult;
                }
                doThrow(errMsg);
            }
            upSourceList.push(upSource);
            upstreamSignList.push(upMgr._getVersionSign());
        });

        if (transformOption) {
            sourceList = applyDataTransform(
                transformOption,
                upSourceList,
                { datasetIndex: datasetModel.componentIndex }
            );
        }
        else if (fromTransformResult != null) {
            sourceList = [cloneSourceShallow(upSourceList[0])];
        }

        return { sourceList, upstreamSignList };
    }

    private _isDirty(): boolean {
        const sourceList = this._sourceList;
        if (!sourceList.length) {
            return true;
        }

        // All sourceList is from the some upsteam.
        const upSourceMgrList = this._getUpstreamSourceManagers();
        for (let i = 0; i < upSourceMgrList.length; i++) {
            const upSrcMgr = upSourceMgrList[i];
            if (
                // Consider the case that there is ancestor diry, call it recursively.
                // The performance is probably not an issue because usually the chain is not long.
                upSrcMgr._isDirty()
                || this._upstreamSignList[i] !== upSrcMgr._getVersionSign()
            ) {
                return true;
            }
        }
    }

    /**
     * @param sourceIndex By defualt 0, means "main source".
     *                    Most cases there is only one source.
     */
    getSource(sourceIndex?: number) {
        return this._sourceList[sourceIndex || 0];
    }

    /**
     * PEDING: Is it fast enough?
     * If no upstream, return empty array.
     */
    private _getUpstreamSourceManagers(): SourceManager[] {
        // Always get the relationship from the raw option.
        // Do not cache the link of the dependency graph, so that
        // no need to update them when change happen.
        const sourceHost = this._sourceHost;

        if (isSeries(sourceHost)) {
            const datasetModel = querySeriesUpstreamDatasetModel(sourceHost);
            return !datasetModel ? [] : [datasetModel.getSourceManager()];
        }
        else {
            return map(
                queryDatasetUpstreamDatasetModels(sourceHost as DatasetModel),
                datasetModel => datasetModel.getSourceManager()
            );
        }
    }

    private _getSourceMetaRawOption(): SourceMetaRawOption {
        const sourceHost = this._sourceHost;
        let seriesLayoutBy: SeriesLayoutBy;
        let sourceHeader: OptionSourceHeader;
        let dimensions: DimensionDefinitionLoose[];
        if (isSeries(sourceHost)) {
            seriesLayoutBy = sourceHost.get('seriesLayoutBy', true);
            sourceHeader = sourceHost.get('sourceHeader', true);
            dimensions = sourceHost.get('dimensions', true);
        }
        // See [REQUIREMENT_MEMO], `non-root-dataset` do not support them.
        else if (!this._getUpstreamSourceManagers().length) {
            const model = sourceHost as DatasetModel;
            seriesLayoutBy = model.get('seriesLayoutBy', true);
            sourceHeader = model.get('sourceHeader', true);
            dimensions = model.get('dimensions', true);
        }
        return { seriesLayoutBy, sourceHeader, dimensions };
    }

}

// Call this method after `super.init` and `super.mergeOption` to
// disable the transform merge, but do not disable transfrom clone from rawOption.
export function disableTransformOptionMerge(datasetModel: DatasetModel): void {
    const transformOption = datasetModel.option.transform;
    transformOption && setAsPrimitive(datasetModel.option.transform);
}

function isSeries(sourceHost: SourceManager['_sourceHost']): sourceHost is SeriesEncodableModel {
    // Avoid circular dependency with Series.ts
    return (sourceHost as SeriesModel).mainType === 'series';
}

function doThrow(errMsg: string): void {
    throw new Error(errMsg);
}
