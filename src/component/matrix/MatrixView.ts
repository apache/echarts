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
                stroke: '#888',
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
        console.log(xCells)

        const cellWidth = rect.width / (xLeavesCnt + yHeight);
        const cellHeight = rect.height / (yLeavesCnt + xHeight);

        for (let i = 1; i <= xHeight; ++i) {
            this.group.add(new graphic.Line({
                shape: {
                    x1: rect.x + (i === xHeight ? 0 : cellWidth),
                    x2: rect.x + rect.width,
                    y1: rect.y + cellHeight * i,
                    y2: rect.y + cellHeight * i,
                },
                style: {
                    stroke: '#ccc'
                }
            }));
        }
        for (let i = 1; i <= yHeight; ++i) {
            this.group.add(new graphic.Line({
                shape: {
                    x1: rect.x + cellWidth * i,
                    x2: rect.x + cellWidth * i,
                    y1: rect.y + (i === yHeight ? 0 : cellHeight),
                    y2: rect.y + rect.height,
                },
                style: {
                    stroke: '#ccc'
                }
            }));
        }

        const xLeft = rect.x + cellWidth * yHeight;
        for (let i = 0; i < xCells.length; i++) {
            const cell = xCells[i];
            const width = cellWidth * cell.colSpan;
            const height = cellHeight * cell.rowSpan;
            const left = xLeft + cellWidth * cell.colId;
            const top = rect.y + cellHeight * cell.rowId;
            this.group.add(new graphic.Text({
                x: left + width / 2,
                y: top + height / 2,
                style: {
                    text: cell.value,
                    fill: '#333',
                }
            }));

            this.group.add(new graphic.Line({
                shape: {
                    x1: left,
                    x2: left,
                    y1: top,
                    y2: top + height,
                },
                style: {
                    stroke: '#ccc'
                }
            }));
            if (left + width < rect.x + rect.width) {
                this.group.add(new graphic.Line({
                    shape: {
                        x1: left + width,
                        x2: left + width,
                        y1: top,
                        y2: top + height,
                    },
                    style: {
                        stroke: '#ccc'
                    }
                }));
            }
        }

        const yTop = rect.y + cellHeight * xHeight;
        for (let i = 0; i < yCells.length; i++) {
            const cell = yCells[i];
            const width = cellWidth * cell.colSpan;
            const height = cellHeight * cell.rowSpan;
            const left = rect.x + cellWidth * cell.rowId;
            const top = yTop + cellHeight * cell.colId;
            this.group.add(new graphic.Text({
                x: left + width / 2,
                y: top + height / 2,
                style: {
                    text: cell.value,
                    fill: '#333',
                }
            }));

            this.group.add(new graphic.Line({
                shape: {
                    x1: left,
                    x2: left + width,
                    y1: top,
                    y2: top,
                },
                style: {
                    stroke: '#ccc'
                }
            }));
            if (top + height < rect.y + rect.height) {
                this.group.add(new graphic.Line({
                    shape: {
                        x1: left,
                        x2: left + width,
                        y1: top + height,
                        y2: top + height,
                    },
                    style: {
                        stroke: '#ccc'
                    }
                }));
            }
        }
    }
}

export default MatrixView;
