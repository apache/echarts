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
import * as zrUtil from 'zrender/src/core/util';
import BrushController, { BrushControllerEvents, BrushDimensionMinMax } from '../../helper/BrushController';
import BrushTargetManager, { BrushTargetInfoCartesian2D } from '../../helper/BrushTargetManager';
import * as history from '../../dataZoom/history';
import sliderMove from '../../helper/sliderMove';
import {
    ToolboxFeature,
    ToolboxFeatureModel,
    ToolboxFeatureOption
} from '../featureManager';
import GlobalModel from '../../../model/Global';
import ExtensionAPI from '../../../core/ExtensionAPI';
import { Payload, Dictionary, ComponentOption, ItemStyleOption } from '../../../util/types';
import Cartesian2D from '../../../coord/cartesian/Cartesian2D';
import CartesianAxisModel from '../../../coord/cartesian/AxisModel';
import DataZoomModel from '../../dataZoom/DataZoomModel';
import {
    DataZoomPayloadBatchItem, DataZoomAxisDimension
} from '../../dataZoom/helper';
import {
    ModelFinderObject, ModelFinderIndexQuery, makeInternalComponentId,
    ModelFinderIdQuery, parseFinder, ParsedModelFinderKnown
} from '../../../util/model';
import ToolboxModel from '../ToolboxModel';
import { registerInternalOptionCreator } from '../../../model/internalComponentCreator';
import ComponentModel from '../../../model/Component';


const each = zrUtil.each;

const DATA_ZOOM_ID_BASE = makeInternalComponentId('toolbox-dataZoom_');

const ICON_TYPES = ['zoom', 'back'] as const;
type IconType = typeof ICON_TYPES[number];

export interface ToolboxDataZoomFeatureOption extends ToolboxFeatureOption {
    type?: IconType[]
    icon?: {[key in IconType]?: string}
    title?: {[key in IconType]?: string}
    // TODO: TYPE Use type in dataZoom
    filterMode?: 'filter' | 'weakFilter' | 'empty' | 'none'
    // Backward compat: false means 'none'
    xAxisIndex?: ModelFinderIndexQuery
    yAxisIndex?: ModelFinderIndexQuery
    xAxisId?: ModelFinderIdQuery
    yAxisId?: ModelFinderIdQuery,

    brushStyle?: ItemStyleOption
}

type ToolboxDataZoomFeatureModel = ToolboxFeatureModel<ToolboxDataZoomFeatureOption>;

class DataZoomFeature extends ToolboxFeature<ToolboxDataZoomFeatureOption> {

    _brushController: BrushController;

    _isZoomActive: boolean;

    render(
        featureModel: ToolboxDataZoomFeatureModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        payload: Payload
    ) {
        if (!this._brushController) {
            this._brushController = new BrushController(api.getZr());
            this._brushController.on('brush', zrUtil.bind(this._onBrush, this))
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
        this._brushController && this._brushController.unmount();
    }

    dispose(
        ecModel: GlobalModel,
        api: ExtensionAPI
    ) {
        this._brushController && this._brushController.dispose();
    }

    private _onBrush(eventParam: BrushControllerEvents['brush']): void {
        const areas = eventParam.areas;
        if (!eventParam.isEnd || !areas.length) {
            return;
        }
        const snapshot: history.DataZoomStoreSnapshot = {};
        const ecModel = this.ecModel;

        this._brushController.updateCovers([]); // remove cover

        const brushTargetManager = new BrushTargetManager(
            makeAxisFinder(this.model),
            ecModel,
            {include: ['grid']}
        );
        brushTargetManager.matchOutputRanges(areas, ecModel, function (area, coordRange, coordSys: Cartesian2D) {
            if (coordSys.type !== 'cartesian2d') {
                return;
            }

            const brushType = area.brushType;
            if (brushType === 'rect') {
                setBatch('x', coordSys, (coordRange as BrushDimensionMinMax[])[0]);
                setBatch('y', coordSys, (coordRange as BrushDimensionMinMax[])[1]);
            }
            else {
                setBatch(
                    ({lineX: 'x', lineY: 'y'} as const)[brushType as 'lineX' | 'lineY'],
                    coordSys,
                    coordRange as BrushDimensionMinMax
                );
            }
        });

        history.push(ecModel, snapshot);

        this._dispatchZoomAction(snapshot);

        function setBatch(dimName: DataZoomAxisDimension, coordSys: Cartesian2D, minMax: number[]) {
            const axis = coordSys.getAxis(dimName);
            const axisModel = axis.model;
            const dataZoomModel = findDataZoom(dimName, axisModel, ecModel);

            // Restrict range.
            const minMaxSpan = dataZoomModel.findRepresentativeAxisProxy(axisModel).getMinMaxSpan();
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

        function findDataZoom(
            dimName: DataZoomAxisDimension, axisModel: CartesianAxisModel, ecModel: GlobalModel
        ): DataZoomModel {
            let found;
            ecModel.eachComponent({mainType: 'dataZoom', subType: 'select'}, function (dzModel: DataZoomModel) {
                const has = dzModel.getAxisModel(dimName, axisModel.componentIndex);
                has && (found = dzModel);
            });
            return found;
        }
    };

    _dispatchZoomAction(snapshot: history.DataZoomStoreSnapshot): void {
        const batch: DataZoomPayloadBatchItem[] = [];

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

    static getDefaultOption(ecModel: GlobalModel) {
        const defaultOption: ToolboxDataZoomFeatureOption = {
            show: true,
            filterMode: 'filter',
            // Icon group
            icon: {
                zoom: 'M0,13.5h26.9 M13.5,26.9V0 M32.1,13.5H58V58H13.5 V32.1',
                back: 'M22,1.4L9.9,13.5l12.3,12.3 M10.3,13.5H54.9v44.6 H10.3v-26'
            },
            // `zoom`, `back`
            title: ecModel.getLocaleModel().get(['toolbox', 'dataZoom', 'title']),
            brushStyle: {
                borderWidth: 0,
                color: 'rgba(210,219,238,0.2)'
            }
        };

        return defaultOption;
    }
}

const handlers: { [key in IconType]: (this: DataZoomFeature) => void } = {
    zoom: function () {
        const nextActive = !this._isZoomActive;

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


function makeAxisFinder(dzFeatureModel: ToolboxDataZoomFeatureModel): ModelFinderObject {
    const setting = {
        xAxisIndex: dzFeatureModel.get('xAxisIndex', true),
        yAxisIndex: dzFeatureModel.get('yAxisIndex', true),
        xAxisId: dzFeatureModel.get('xAxisId', true),
        yAxisId: dzFeatureModel.get('yAxisId', true)
    } as ModelFinderObject;

    // If both `xAxisIndex` `xAxisId` not set, it means 'all'.
    // If both `yAxisIndex` `yAxisId` not set, it means 'all'.
    // Some old cases set like this below to close yAxis control but leave xAxis control:
    // `{ feature: { dataZoom: { yAxisIndex: false } }`.
    if (setting.xAxisIndex == null && setting.xAxisId == null) {
        setting.xAxisIndex = 'all';
    }
    if (setting.yAxisIndex == null && setting.yAxisId == null) {
        setting.yAxisIndex = 'all';
    }

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
    let zoomActive = view._isZoomActive;

    if (payload && payload.type === 'takeGlobalCursor') {
        zoomActive = payload.key === 'dataZoomSelect'
            ? payload.dataZoomSelectActive : false;
    }

    view._isZoomActive = zoomActive;

    featureModel.setIconStatus('zoom', zoomActive ? 'emphasis' : 'normal');

    const brushTargetManager = new BrushTargetManager(
        makeAxisFinder(featureModel),
        ecModel,
        {include: ['grid']}
    );

    const panels = brushTargetManager.makePanelOpts(api, function (targetInfo: BrushTargetInfoCartesian2D) {
        return (targetInfo.xAxisDeclared && !targetInfo.yAxisDeclared)
            ? 'lineX'
            : (!targetInfo.xAxisDeclared && targetInfo.yAxisDeclared)
            ? 'lineY'
            : 'rect';
    });

    view._brushController
        .setPanels(panels)
        .enableBrush(
            (zoomActive && panels.length)
            ? {
                brushType: 'auto',
                brushStyle: featureModel.getModel('brushStyle').getItemStyle()
            }
            : false
        );
}

registerInternalOptionCreator('dataZoom', function (ecModel: GlobalModel): ComponentOption[] {
    const toolboxModel = ecModel.getComponent('toolbox', 0) as ToolboxModel;
    const featureDataZoomPath = ['feature', 'dataZoom'] as const;
    if (!toolboxModel || toolboxModel.get(featureDataZoomPath) == null) {
        return;
    }
    const dzFeatureModel = toolboxModel.getModel(featureDataZoomPath as any) as ToolboxDataZoomFeatureModel;
    const dzOptions = [] as ComponentOption[];

    const finder = makeAxisFinder(dzFeatureModel);
    const finderResult = parseFinder(ecModel, finder) as ParsedModelFinderKnown;

    each(finderResult.xAxisModels, axisModel => buildInternalOptions(axisModel, 'xAxis', 'xAxisIndex'));
    each(finderResult.yAxisModels, axisModel => buildInternalOptions(axisModel, 'yAxis', 'yAxisIndex'));

    function buildInternalOptions(
        axisModel: ComponentModel,
        axisMainType: 'xAxis' | 'yAxis',
        axisIndexPropName: 'xAxisIndex' | 'yAxisIndex'
    ) {
        const axisIndex = axisModel.componentIndex;
        const newOpt = {
            type: 'select',
            $fromToolbox: true,
            // Default to be filter
            filterMode: dzFeatureModel.get('filterMode', true) || 'filter',
            // Id for merge mapping.
            id: DATA_ZOOM_ID_BASE + axisMainType + axisIndex
        } as Dictionary<unknown>;
        newOpt[axisIndexPropName] = axisIndex;

        dzOptions.push(newOpt);
    }

    return dzOptions;
});


export default DataZoomFeature;
