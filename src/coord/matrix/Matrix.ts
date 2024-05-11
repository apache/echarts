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

import { RectLike } from 'zrender/src/core/BoundingRect';
import type SeriesModel from '../../model/Series';
import type { SeriesOnMatrixOptionMixin, SeriesOption } from '../../util/types';
import { CoordinateSystem, CoordinateSystemMaster } from '../CoordinateSystem';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import MatrixModel from './MatrixModel';
import { LayoutRect, getLayoutRect } from '../../util/layout';
import { MatrixDim } from './MatrixDim';

class Matrix implements CoordinateSystem, CoordinateSystemMaster {

    static readonly dimensions = ['x', 'y', 'value'];
    static getDimensionsInfo() {
        return ['x', 'y', 'value'];
    }

    readonly dimensions = Matrix.dimensions;
    readonly type = 'matrix';

    private _model: MatrixModel;
    private _rect: LayoutRect;
    private _xDim: MatrixDim;
    private _yDim: MatrixDim;
    private _lineWidth: number;

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
        this._xDim = new MatrixDim(matrixModel.get('x'));
        this._yDim = new MatrixDim(matrixModel.get('y'));
    }

    getRect(): LayoutRect {
        return this._rect;
    }

    getDim(dim: 'x' | 'y'): MatrixDim {
        return dim === 'x' ? this._xDim : this._yDim;
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
        this._lineWidth = matrixModel.getModel('backgroundStyle')
            .getItemStyle().lineWidth || 0;
    }

    dataToPoint(data: [string, string]): number[] {
        const xCell = this._xDim.getCell(data[0]);
        const yCell = this._yDim.getCell(data[1]);
        const xLeavesCnt = this._xDim.getLeavesCount();
        const yLeavesCnt = this._yDim.getLeavesCount();
        const xHeight = this._xDim.getHeight();
        const yHeight = this._yDim.getHeight();
        const cellWidth = this._rect.width / (xLeavesCnt + yHeight) * xCell.colSpan;
        const cellHeight = this._rect.height / (yLeavesCnt + xHeight) * yCell.rowSpan;
        return [
            this._rect.x + this._rect.width / (xLeavesCnt + yHeight)
                * (xCell.colId + yHeight) + cellWidth / 2,
            this._rect.y + this._rect.height / (yLeavesCnt + xHeight)
                * (yCell.colId + xHeight) + cellHeight / 2
        ];
    }

    dataToRect(data: [string, string]): RectLike {
        const xCell = this._xDim.getCell(data[0]);
        const yCell = this._yDim.getCell(data[1]);
        const xLeavesCnt = this._xDim.getLeavesCount();
        const yLeavesCnt = this._yDim.getLeavesCount();
        const xHeight = this._xDim.getHeight();
        const yHeight = this._yDim.getHeight();
        const cellWidth = this._rect.width / (xLeavesCnt + yHeight) * xCell.colSpan;
        const cellHeight = this._rect.height / (yLeavesCnt + xHeight) * yCell.rowSpan;
        const halfLineWidth = this._lineWidth / 2;
        return {
            x: this._rect.x + this._rect.width / (xLeavesCnt + yHeight)
                * (xCell.colId + yHeight) + halfLineWidth,
            y: this._rect.y + this._rect.height / (yLeavesCnt + xHeight)
                * (yCell.colId + xHeight) + halfLineWidth,
            width: cellWidth - halfLineWidth * 2,
            height: cellHeight - halfLineWidth * 2
        };
    }

    containPoint(point: number[]): boolean {
        console.warn('Not implemented.');
        return false;
    }
}

export default Matrix;
