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


// TODO depends on DataZoom and Brush
import * as echarts from '../../../echarts';
import * as zrUtil from 'zrender/src/core/util';
import BrushController, { BrushControllerEvents, BrushDimensionMinMax } from '../../helper/BrushController';
import BrushTargetManager, { BrushTargetInfoCartesian2D } from '../../helper/BrushTargetManager';
import * as history from '../../dataZoom/history';
import sliderMove from '../../helper/sliderMove';
import lang from '../../../lang';
// Use dataZoomSelect
import '../../dataZoomSelect';
import {
    ToolboxFeature,
    ToolboxFeatureModel,
    ToolboxFeatureOption,
    registerFeature
} from '../featureManager';
import GlobalModel from '../../../model/Global';
import ExtensionAPI from '../../../ExtensionAPI';
import { Payload, ECUnitOption, Dictionary } from '../../../util/types';
import Cartesian2D from '../../../coord/cartesian/Cartesian2D';
import CartesianAxisModel from '../../../coord/cartesian/AxisModel';
import DataZoomModel from '../../dataZoom/DataZoomModel';
import { DataZoomPayloadBatchItem } from '../../dataZoom/helper';
import { ModelFinderObject, ModelFinderIndexQuery } from '../../../util/model';
import { ToolboxOption } from '../ToolboxModel';

var dataZoomLang = lang.toolbox.dataZoom;
var each = zrUtil.each;

// Spectial component id start with \0ec\0, see echarts/model/Global.js~hasInnerId
var DATA_ZOOM_ID_BASE = '\0_ec_\0toolbox-dataZoom_';

const ICON_TYPES = ['zoom', 'back'] as const;
type IconType = typeof ICON_TYPES[number];

interface ToolboxDataZoomFeatureOption extends ToolboxFeatureOption {
    type?: IconType[]
    icon?: {[key in IconType]?: string}
    title?: {[key in IconType]?: string}
    // TODO: TYPE Use type in dataZoom
    filterMode?: 'filter' | 'weakFilter' | 'empty' | 'none'
    // Backward compat: false means 'none'
    xAxisIndex?: ModelFinderIndexQuery | false
    yAxisIndex?: ModelFinderIndexQuery | false
}

type ToolboxDataZoomFeatureModel = ToolboxFeatureModel<ToolboxDataZoomFeatureOption>

class DataZoomFeature extends ToolboxFeature<ToolboxDataZoomFeatureOption> {

    brushController: BrushController;

    isZoomActive: boolean;

    render(
        featureModel: ToolboxDataZoomFeatureModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: Payload
    ) {
        if (!this.brushController) {
            this.brushController = new BrushController(api.getZr());
            this.brushController.on('brush', zrUtil.bind(this._onBrush, this))
                .mount();
        }
        updateZoomBtnStatus(featureModel, ecModel, this, payload, api);
        updateBackBtnStatus(featureModel, ecModel);
    }

    onclick(
        ecModel: GlobalModel,
        api: ExtensionAPI,
        type: IconType
    ) {
        handlers[type].call(this);
    }

    remove(
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
        this.brushController.unmount();
    }

    dispose(
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
        this.brushController.dispose();
    }

    private _onBrush(eventParam: BrushControllerEvents['brush']): void {
        var areas = eventParam.areas;
        if (!eventParam.isEnd || !areas.length) {
            return;
        }
        var snapshot: history.DataZoomStoreSnapshot = {};
        var ecModel = this.ecModel;

        this.brushController.updateCovers([]); // remove cover

        var brushTargetManager = new BrushTargetManager(
            retrieveAxisSetting(this.model.option), ecModel, {include: ['grid']}
        );
        brushTargetManager.matchOutputRanges(areas, ecModel, function (area, coordRange, coordSys: Cartesian2D) {
            if (coordSys.type !== 'cartesian2d') {
                return;
            }

            var brushType = area.brushType;
            if (brushType === 'rect') {
                setBatch('x', coordSys, (coordRange as BrushDimensionMinMax[])[0]);
                setBatch('y', coordSys, (coordRange as BrushDimensionMinMax[])[1]);
            }
            else {
                setBatch(
                    ({lineX: 'x', lineY: 'y'})[brushType as 'lineX' | 'lineY'],
                    coordSys,
                    coordRange as BrushDimensionMinMax
                );
            }
        });

        history.push(ecModel, snapshot);

        this._dispatchZoomAction(snapshot);

        function setBatch(dimName: string, coordSys: Cartesian2D, minMax: number[]) {
            var axis = coordSys.getAxis(dimName);
            var axisModel = axis.model;
            var dataZoomModel = findDataZoom(dimName, axisModel, ecModel);

            // Restrict range.
            var minMaxSpan = dataZoomModel.findRepresentativeAxisProxy(axisModel).getMinMaxSpan();
            if (minMaxSpan.minValueSpan != null || minMaxSpan.maxValueSpan != null) {
                minMax = sliderMove(
                    0, minMax.slice(), axis.scale.getExtent(), 0,
                    minMaxSpan.minValueSpan, minMaxSpan.maxValueSpan
                );
            }

            dataZoomModel && (snapshot[dataZoomModel.id] = {
                dataZoomId: dataZoomModel.id,
                startValue: minMax[0],
                endValue: minMax[1]
            });
        }

        function findDataZoom(dimName: string, axisModel: CartesianAxisModel, ecModel: GlobalModel): DataZoomModel {
            var found;
            ecModel.eachComponent({mainType: 'dataZoom', subType: 'select'}, function (dzModel: DataZoomModel) {
                var has = dzModel.getAxisModel(dimName, axisModel.componentIndex);
                has && (found = dzModel);
            });
            return found;
        }
    };

    /**
     * @internal
     */
    _dispatchZoomAction(snapshot: history.DataZoomStoreSnapshot): void {
        var batch: DataZoomPayloadBatchItem[] = [];

        // Convert from hash map to array.
        each(snapshot, function (batchItem, dataZoomId) {
            batch.push(zrUtil.clone(batchItem));
        });

        batch.length && this.api.dispatchAction({
            type: 'dataZoom',
            from: this.uid,
            batch: batch
        });
    }

    static defaultOption: ToolboxDataZoomFeatureOption = {
        show: true,
        filterMode: 'filter',
        // Icon group
        icon: {
            zoom: 'M0,13.5h26.9 M13.5,26.9V0 M32.1,13.5H58V58H13.5 V32.1',
            back: 'M22,1.4L9.9,13.5l12.3,12.3 M10.3,13.5H54.9v44.6 H10.3v-26'
        },
        // `zoom`, `back`
        title: zrUtil.clone(dataZoomLang.title)
    };
}

const handlers: { [key in IconType]: (this: DataZoomFeature) => void } = {
    zoom: function () {
        var nextActive = !this.isZoomActive;

        this.api.dispatchAction({
            type: 'takeGlobalCursor',
            key: 'dataZoomSelect',
            dataZoomSelectActive: nextActive
        });
    },

    back: function () {
        this._dispatchZoomAction(history.pop(this.ecModel));
    }
};


function retrieveAxisSetting(option: ToolboxDataZoomFeatureOption): ModelFinderObject {
    var setting = {} as ModelFinderObject;
    // Compatible with previous setting: null => all axis, false => no axis.
    zrUtil.each(['xAxisIndex', 'yAxisIndex'] as const, function (name) {
        var val = option[name];
        val == null && (val = 'all');
        (val === false || val === 'none') && (val = []);
        setting[name] = val;
    });
    return setting;
}

function updateBackBtnStatus(
    featureModel: ToolboxDataZoomFeatureModel,
    ecModel: GlobalModel
) {
    featureModel.setIconStatus(
        'back',
        history.count(ecModel) > 1 ? 'emphasis' : 'normal'
    );
}

function updateZoomBtnStatus(
    featureModel: ToolboxDataZoomFeatureModel,
    ecModel: GlobalModel,
    view: DataZoomFeature,
    payload: Payload,
    api: ExtensionAPI
) {
    var zoomActive = view.isZoomActive;

    if (payload && payload.type === 'takeGlobalCursor') {
        zoomActive = payload.key === 'dataZoomSelect'
            ? payload.dataZoomSelectActive : false;
    }

    view.isZoomActive = zoomActive;

    featureModel.setIconStatus('zoom', zoomActive ? 'emphasis' : 'normal');

    var brushTargetManager = new BrushTargetManager(
        retrieveAxisSetting(featureModel.option), ecModel, {include: ['grid']}
    );

    view.brushController
        .setPanels(brushTargetManager.makePanelOpts(api, function (targetInfo: BrushTargetInfoCartesian2D) {
            return (targetInfo.xAxisDeclared && !targetInfo.yAxisDeclared)
                ? 'lineX'
                : (!targetInfo.xAxisDeclared && targetInfo.yAxisDeclared)
                ? 'lineY'
                : 'rect';
        }))
        .enableBrush(
            zoomActive
            ? {
                brushType: 'auto',
                brushStyle: {
                    // FIXME user customized?
                    lineWidth: 0,
                    fill: 'rgba(0,0,0,0.2)'
                }
            }
            : false
        );
}


registerFeature('dataZoom', DataZoomFeature);


// Create special dataZoom option for select
// FIXME consider the case of merge option, where axes options are not exists.
echarts.registerPreprocessor(function (option: ECUnitOption) {
    if (!option) {
        return;
    }

    var dataZoomOpts = option.dataZoom || (option.dataZoom = []);
    if (!zrUtil.isArray(dataZoomOpts)) {
        option.dataZoom = dataZoomOpts = [dataZoomOpts];
    }

    var toolboxOpt = option.toolbox as ToolboxOption;
    if (toolboxOpt) {
        // Assume there is only one toolbox
        if (zrUtil.isArray(toolboxOpt)) {
            toolboxOpt = toolboxOpt[0];
        }

        if (toolboxOpt && toolboxOpt.feature) {
            var dataZoomOpt = toolboxOpt.feature.dataZoom as ToolboxDataZoomFeatureOption;
            // FIXME: If add dataZoom when setOption in merge mode,
            // no axis info to be added. See `test/dataZoom-extreme.html`
            addForAxis('xAxis', dataZoomOpt);
            addForAxis('yAxis', dataZoomOpt);
        }
    }

    function addForAxis(axisName: 'xAxis' | 'yAxis', dataZoomOpt: ToolboxDataZoomFeatureOption): void {
        if (!dataZoomOpt) {
            return;
        }

        // Try not to modify model, because it is not merged yet.
        var axisIndicesName = axisName + 'Index' as 'xAxisIndex' | 'yAxisIndex';
        var givenAxisIndices = dataZoomOpt[axisIndicesName];
        if (givenAxisIndices != null
            && givenAxisIndices !== 'all'
            && !zrUtil.isArray(givenAxisIndices)
        ) {
            givenAxisIndices = (givenAxisIndices === false || givenAxisIndices === 'none') ? [] : [givenAxisIndices];
        }

        forEachComponent(axisName, function (axisOpt: unknown, axisIndex: number) {
            if (givenAxisIndices != null
                && givenAxisIndices !== 'all'
                && zrUtil.indexOf(givenAxisIndices as number[], axisIndex) === -1
            ) {
                return;
            }
            var newOpt = {
                type: 'select',
                $fromToolbox: true,
                // Default to be filter
                filterMode: dataZoomOpt.filterMode || 'filter',
                // Id for merge mapping.
                id: DATA_ZOOM_ID_BASE + axisName + axisIndex
            } as Dictionary<unknown>;
            // FIXME
            // Only support one axis now.
            newOpt[axisIndicesName] = axisIndex;
            dataZoomOpts.push(newOpt);
        });
    }

    function forEachComponent(mainType: string, cb: (axisOpt: unknown, axisIndex: number) => void) {
        var opts = option[mainType];
        if (!zrUtil.isArray(opts)) {
            opts = opts ? [opts] : [];
        }
        each(opts, cb);
    }
});

export default DataZoomFeature;
