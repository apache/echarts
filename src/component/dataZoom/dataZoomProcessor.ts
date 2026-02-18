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

import {createHashMap, each} from 'zrender/src/core/util';
import SeriesModel from '../../model/Series';
import DataZoomModel from './DataZoomModel';
import {
    getAxisMainType, DataZoomAxisDimension, getAlignTo, getAxisProxyFromModel, setAxisProxyToModel
} from './helper';
import AxisProxy from './AxisProxy';
import { StageHandler } from '../../util/types';
import { AxisBaseModel } from '../../coord/AxisBaseModel';


const dataZoomProcessor: StageHandler = {

    // `dataZoomProcessor` will only be performed in needed series. Consider if
    // there is a line series and a pie series, it is better not to update the
    // line series if only pie series is needed to be updated.
    getTargetSeries(ecModel) {

        function eachAxisModel(
            cb: (
                axisDim: DataZoomAxisDimension,
                axisIndex: number,
                axisModel: AxisBaseModel,
                dataZoomModel: DataZoomModel
            ) => void
        ) {
            ecModel.eachComponent('dataZoom', function (dataZoomModel: DataZoomModel) {
                dataZoomModel.eachTargetAxis(function (axisDim, axisIndex) {
                    const axisModel = ecModel.getComponent(getAxisMainType(axisDim), axisIndex);
                    cb(axisDim, axisIndex, axisModel as AxisBaseModel, dataZoomModel);
                });
            });
        }
        // FIXME: it brings side-effect to `getTargetSeries`.
        const proxyList: AxisProxy[] = [];
        eachAxisModel(function (axisDim, axisIndex, axisModel, dataZoomModel) {
            // Different dataZooms may control the same axis. In that case,
            // an axisProxy serves both of them.
            if (!getAxisProxyFromModel(axisModel)) {
                // Use the first dataZoomModel as the main model of axisProxy.
                const axisProxy = new AxisProxy(axisDim, axisIndex, dataZoomModel, ecModel);
                proxyList.push(axisProxy);
                setAxisProxyToModel(axisModel, axisProxy);
            }
        });

        const seriesModelMap = createHashMap<SeriesModel>();
        each(proxyList, function (axisProxy) {
            each(axisProxy.getTargetSeriesModels(), function (seriesModel) {
                seriesModelMap.set(seriesModel.uid, seriesModel);
            });
        });

        return seriesModelMap;
    },

    // Consider appendData, where filter should be performed. Because data process is
    // in block mode currently, it is not need to worry about that the overallProgress
    // execute every frame.
    overallReset(ecModel, api) {

        ecModel.eachComponent('dataZoom', function (dataZoomModel: DataZoomModel) {
            // We calculate window and reset axis here but not in model
            // init stage and not after action dispatch handler, because
            // reset should be called after seriesData.restoreData.
            const axisProxyNeedAlign: [AxisProxy, AxisProxy][] = [];
            dataZoomModel.eachTargetAxis(function (axisDim, axisIndex) {
                const axisProxy = dataZoomModel.getAxisProxy(axisDim, axisIndex);
                const alignToAxisProxy = getAlignTo(dataZoomModel, axisProxy);
                if (alignToAxisProxy) {
                    axisProxyNeedAlign.push([axisProxy, alignToAxisProxy]);
                }
                else {
                    axisProxy.reset(dataZoomModel, null);
                }
            });
            each(axisProxyNeedAlign, function (item) {
                item[0].reset(dataZoomModel, item[1].getWindow().percentInverted);
            });

            // Caution: data zoom filtering is order sensitive when using
            // percent range and no min/max/scale set on axis.
            // For example, we have dataZoom definition:
            // [
            //      {xAxisIndex: 0, start: 30, end: 70},
            //      {yAxisIndex: 0, start: 20, end: 80}
            // ]
            // In this case, [20, 80] of y-dataZoom should be based on data
            // that have filtered by x-dataZoom using range of [30, 70],
            // but should not be based on full raw data. Thus sliding
            // x-dataZoom will change both ranges of xAxis and yAxis,
            // while sliding y-dataZoom will only change the range of yAxis.
            // So we should filter x-axis after reset x-axis immediately,
            // and then reset y-axis and filter y-axis.
            dataZoomModel.eachTargetAxis(function (axisDim, axisIndex) {
                dataZoomModel.getAxisProxy(axisDim, axisIndex).filterData(dataZoomModel, api);
            });
        });

        ecModel.eachComponent('dataZoom', function (dataZoomModel: DataZoomModel) {
            // Fullfill all of the range props so that user
            // is able to get them from chart.getOption().
            const axisProxy = dataZoomModel.findRepresentativeAxisProxy();
            if (axisProxy) {
                const {percent, value} = axisProxy.getWindow();

                dataZoomModel.setCalculatedRange({
                    start: percent[0],
                    end: percent[1],
                    startValue: value[0],
                    endValue: value[1]
                });
            }
        });
    }
};

export default dataZoomProcessor;
