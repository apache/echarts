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

import BoundingRect from 'zrender/src/core/BoundingRect';
import { MatrixArray } from 'zrender/src/core/matrix';
import { PrepareCustomInfo } from '../../chart/custom/CustomSeries';
import { ComponentModel, SeriesModel } from '../../echarts.all';
import { ComponentOption, ScaleDataValue, SeriesOnMatrixOptionMixin, SeriesOption } from '../../util/types';
import Axis from '../Axis';
import { CoordinateSystem, CoordinateSystemClipArea, CoordinateSystemMaster } from '../CoordinateSystem';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import MatrixModel from './MatrixModel';
import { LayoutRect, getLayoutRect } from '../../util/layout';

class Matrix implements CoordinateSystem, CoordinateSystemMaster {

    static readonly dimensions = [''];

    private _model: MatrixModel;
    private _rect: LayoutRect;

    static create(ecModel: GlobalModel, api: ExtensionAPI) {
        const matrixList: Matrix[] = [];

        ecModel.eachComponent('matrix', function (matrixModel: MatrixModel) {
            const matrix = new Matrix(matrixModel, ecModel, api);
            matrixList.push(matrix);
            matrixModel.coordinateSystem = matrix;
        });

        ecModel.eachSeries(function (matrixSeries: SeriesModel<SeriesOption & SeriesOnMatrixOptionMixin>) {
            if (matrixSeries.get('coordinateSystem') === 'matrix') {
                // Inject coordinate system
                matrixSeries.coordinateSystem = matrixList[matrixSeries.get('matrixIndex') || 0];
            }
        });
        return matrixList;
    }

    constructor(matrixModel: MatrixModel, ecModel: GlobalModel, api: ExtensionAPI) {
        this._model = matrixModel;
    }

    getRect(): LayoutRect {
        return this._rect;
    }

    update(ecModel: GlobalModel, api: ExtensionAPI) {
        this.resize(this._model, api);
    }

    resize(matrixModel: MatrixModel, api: ExtensionAPI) {
        const boxLayoutParams = matrixModel.getBoxLayoutParams();
        const gridRect = getLayoutRect(
            boxLayoutParams, {
                width: api.getWidth(),
                height: api.getHeight()
            });
        this._rect = gridRect;
    }

    type: string;
    master?: CoordinateSystemMaster;
    dimensions: string[];
    model?: ComponentModel<ComponentOption>;
    dataToPoint(data: ScaleDataValue | ScaleDataValue[], reserved?: any, out?: number[]): number[] {
        return [0, 0];
    }
    pointToData?(point: number[], clamp?: boolean): number | number[] {
        throw new Error('Method not implemented.');
    }
    containPoint(point: number[]): boolean {
        throw new Error('Method not implemented.');
    }
    getAxes?: () => Axis[];
    getAxis?: (dim?: string) => Axis;
    getBaseAxis?: () => Axis;
    getOtherAxis?: (baseAxis: Axis) => Axis;
    clampData?: (data: ScaleDataValue[], out?: number[]) => number[];
    getRoamTransform?: () => MatrixArray;
    getArea?: (tolerance?: number) => CoordinateSystemClipArea;
    getBoundingRect?: () => BoundingRect;
    getAxesByScale?: (scaleType: string) => Axis[];
    prepareCustoms?: PrepareCustomInfo;
}

export default Matrix;
