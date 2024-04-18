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

import MatrixModel from '../../coord/matrix/MatrixModel';
import ExtensionAPI from '../../core/ExtensionAPI';
import ComponentView from '../../view/Component';
import { createTextStyle } from '../../label/labelStyle';
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
        const xDim = coordSys.getDim('x');
        const yDim = coordSys.getDim('y');
        const xModel = matrixModel.getModel('x');
        const yModel = matrixModel.getModel('y');
        const xLabelModel = xModel.getModel('label');
        const yLabelModel = yModel.getModel('label');
        const xItemStyle = xModel.getModel('itemStyle').getItemStyle();
        const yItemStyle = yModel.getModel('itemStyle').getItemStyle();

        const rect = coordSys.getRect();
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
            const left = xLeft + cellWidth * cell.colId;
            const top = rect.y + cellHeight * cell.rowId;

            this.group.add(new graphic.Rect({
                shape: {
                    x: left,
                    y: top,
                    width: width,
                    height: height
                },
                style: xItemStyle
            }));
            this.group.add(new graphic.Text({
                style: createTextStyle(xLabelModel, {
                    text: cell.value,
                    x: left + width / 2,
                    y: top + height / 2,
                    verticalAlign: 'middle',
                    align: 'center'
                })
            }));
        }

        const yTop = rect.y + cellHeight * xHeight;
        for (let i = 0; i < yCells.length; i++) {
            const cell = yCells[i];
            const width = cellWidth * cell.colSpan;
            const height = cellHeight * cell.rowSpan;
            const left = rect.x + cellWidth * cell.rowId;
            const top = yTop + cellHeight * cell.colId;

            this.group.add(new graphic.Rect({
                shape: {
                    x: left,
                    y: top,
                    width: width,
                    height: height
                },
                style: yItemStyle
            }));
            this.group.add(new graphic.Text({
                style: createTextStyle(yLabelModel, {
                    text: cell.value,
                    x: left + width / 2,
                    y: top + height / 2,
                    verticalAlign: 'middle',
                    align: 'center'
                })
            }));
        }

        // Inner cells
        const innerBackgroundStyle = matrixModel
            .getModel('innerBackgroundStyle')
            .getItemStyle();
        for (let i = 0; i < xLeavesCnt; i++) {
            for (let j = 0; j < yLeavesCnt; j++) {
                const left = xLeft + cellWidth * i;
                const top = yTop + cellHeight * j;
                this.group.add(new graphic.Rect({
                    shape: {
                        x: left,
                        y: top,
                        width: cellWidth,
                        height: cellHeight
                    },
                    style: innerBackgroundStyle
                }));
            }
        }

        // Outer border
        const backgroundStyle = matrixModel
            .getModel('backgroundStyle')
            .getItemStyle();
        this.group.add(new graphic.Rect({
            shape: rect,
            style: backgroundStyle
        }));
        // Header border
        this.group.add(new graphic.Line({
            shape: {
                x1: rect.x,
                y1: yTop,
                x2: rect.x + rect.width,
                y2: yTop
            },
            style: backgroundStyle
        }));
        this.group.add(new graphic.Line({
            shape: {
                x1: xLeft,
                y1: rect.y,
                x2: xLeft,
                y2: rect.y + rect.height
            },
            style: backgroundStyle
        }));
    }
}

export default MatrixView;
