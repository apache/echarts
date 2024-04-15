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

import { MatrixNodeOption } from '../../coord/matrix/MatrixDim';
import MatrixModel from '../../coord/matrix/MatrixModel';
import ExtensionAPI from '../../core/ExtensionAPI';
import { ComponentView } from '../../echarts.all';
import GlobalModel from '../../model/Global';
import * as graphic from '../../util/graphic';

class MatrixView extends ComponentView {

    static type = 'matrix';
    type = MatrixView.type;

    render(matrixModel: MatrixModel, ecModel: GlobalModel, api: ExtensionAPI) {

        const group = this.group;

        group.removeAll();

        this._renderTable(matrixModel);
    }

    protected _renderTable(matrixModel: MatrixModel) {
        const coordSys = matrixModel.coordinateSystem;
        const rect = coordSys.getRect();
        this.group.add(new graphic.Rect({
            shape: rect,
            style: {
                fill: 'none',
                stroke: '#333',
                lineWidth: 1
            }
        }));

        const xDim = coordSys.getDim('x');
        const yDim = coordSys.getDim('y');
        const xLeavesCnt = xDim.getLeavesCount();
        const yLeavesCnt = yDim.getLeavesCount();

        const xCells = xDim.getCells();
        const xHeight = xDim.getHeight();
        const yCells = yDim.getCells();
        const yHeight = yDim.getHeight();

        const cellWidth = rect.width / (xLeavesCnt + yHeight);
        const cellHeight = rect.height / (yLeavesCnt + xHeight);

        const xLeft = rect.x + cellWidth * yHeight;
        for (let i = 0; i < xCells.length; i++) {
            const cell = xCells[i];
            const width = cellWidth * cell.colSpan;
            const height = cellHeight * cell.rowSpan;
            this.group.add(new graphic.Text({
                x: xLeft + cellWidth * cell.colId + width / 2,
                y: rect.y + cellHeight * cell.rowId + height / 2,
                style: {
                    text: cell.value,
                    fill: '#333',
                }
            }));
        }

        const yTop = cellHeight * xHeight;
        for (let i = 0; i < yCells.length; i++) {
            const cell = yCells[i];
            const width = cellWidth * cell.colSpan;
            const height = cellHeight * cell.rowSpan;
            this.group.add(new graphic.Text({
                x: rect.x + cellWidth * cell.rowId + width / 2,
                y: yTop + cellHeight * cell.colId + height / 2,
                style: {
                    text: cell.value,
                    fill: '#333',
                }
            }));
        }
    }
}

export default MatrixView;
