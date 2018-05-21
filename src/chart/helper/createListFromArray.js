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
import List from '../../data/List';
import createDimensions from '../../data/helper/createDimensions';
import {SOURCE_FORMAT_ORIGINAL} from '../../data/helper/sourceType';
import {getDimensionTypeByAxis} from '../../data/helper/dimensionHelper';
import {getDataItemValue} from '../../util/model';
import CoordinateSystem from '../../CoordinateSystem';
import {getCoordSysDefineBySeries} from '../../model/referHelper';
import Source from '../../data/Source';
import {enableDataStack} from '../../data/helper/dataStackHelper';

/**
 * @param {module:echarts/data/Source|Array} source Or raw data.
 * @param {module:echarts/model/Series} seriesModel
 * @param {Object} [opt]
 * @param {string} [opt.generateCoord]
 */
function createListFromArray(source, seriesModel, opt) {
    opt = opt || {};

    if (!Source.isInstance(source)) {
        source = Source.seriesDataToSource(source);
    }

    var coordSysName = seriesModel.get('coordinateSystem');
    var registeredCoordSys = CoordinateSystem.get(coordSysName);

    var coordSysDefine = getCoordSysDefineBySeries(seriesModel);

    var coordSysDimDefs;

    if (coordSysDefine) {
        coordSysDimDefs = zrUtil.map(coordSysDefine.coordSysDims, function (dim) {
            var dimInfo = {name: dim};
            var axisModel = coordSysDefine.axisMap.get(dim);
            if (axisModel) {
                var axisType = axisModel.get('type');
                dimInfo.type = getDimensionTypeByAxis(axisType);
                // dimInfo.stackable = isStackable(axisType);
            }
            return dimInfo;
        });
    }

    if (!coordSysDimDefs) {
        // Get dimensions from registered coordinate system
        coordSysDimDefs = (registeredCoordSys && (
            registeredCoordSys.getDimensionsInfo
                ? registeredCoordSys.getDimensionsInfo()
                : registeredCoordSys.dimensions.slice()
        )) || ['x', 'y'];
    }

    var dimInfoList = createDimensions(source, {
        coordDimensions: coordSysDimDefs,
        generateCoord: opt.generateCoord
    });

    var firstCategoryDimIndex;
    var hasNameEncode;
    coordSysDefine && zrUtil.each(dimInfoList, function (dimInfo, dimIndex) {
        var coordDim = dimInfo.coordDim;
        var categoryAxisModel = coordSysDefine.categoryAxisMap.get(coordDim);
        if (categoryAxisModel) {
            if (firstCategoryDimIndex == null) {
                firstCategoryDimIndex = dimIndex;
            }
            dimInfo.ordinalMeta = categoryAxisModel.getOrdinalMeta();
        }
        if (dimInfo.otherDims.itemName != null) {
            hasNameEncode = true;
        }
    });
    if (!hasNameEncode && firstCategoryDimIndex != null) {
        dimInfoList[firstCategoryDimIndex].otherDims.itemName = 0;
    }

    var stackCalculationInfo = enableDataStack(seriesModel, dimInfoList);

    var list = new List(dimInfoList, seriesModel);

    list.setCalculationInfo(stackCalculationInfo);

    var dimValueGetter = (firstCategoryDimIndex != null && isNeedCompleteOrdinalData(source))
        ? function (itemOpt, dimName, dataIndex, dimIndex) {
            // Use dataIndex as ordinal value in categoryAxis
            return dimIndex === firstCategoryDimIndex
                ? dataIndex
                : this.defaultDimValueGetter(itemOpt, dimName, dataIndex, dimIndex);
        }
        : null;

    list.hasItemOption = false;
    list.initData(source, null, dimValueGetter);

    return list;
}

function isNeedCompleteOrdinalData(source) {
    if (source.sourceFormat === SOURCE_FORMAT_ORIGINAL) {
        var sampleItem = firstDataNotNull(source.data || []);
        return sampleItem != null
            && !zrUtil.isArray(getDataItemValue(sampleItem));
    }
}

function firstDataNotNull(data) {
    var i = 0;
    while (i < data.length && data[i] == null) {
        i++;
    }
    return data[i];
}

export default createListFromArray;
