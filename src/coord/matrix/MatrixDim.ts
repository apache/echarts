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

export type MatrixNodeOption = {
    value?: string;
    children?: MatrixNodeOption[];
};

export type MatrixNodeRawOption = string | MatrixNodeOption;

export interface MatrixDimOption {
    data?: MatrixNodeOption[];
}
export interface MatrixDimRawOption {
    data?: MatrixNodeRawOption[];
}

export interface MatrixCell {
    value: string;
    rowId: number;
    rowSpan: number;
    colId: number;
    colSpan: number;
}

export class MatrixDim {

    private _option: MatrixDimOption;
    private _cells: MatrixCell[];

    constructor(option: MatrixDimOption) {
        this._option = option || { data: [] };
        if (!this._option.data) {
            this._option.data = [];
        }
        this._initCells();
        console.log(this._cells)
    }

    getLeavesCount() {
        if (!this._option.data) {
            return 0;
        }
        if (typeof this._option.data === 'string') {
            return 1;
        }
        let cnt = 0;
        for (let i = 0; i < this._option.data.length; i++) {
            cnt += this._countLeaves(this._option.data[i]);
        }
        return cnt;
    }

    getHeight() {
        if (!this._option.data) {
            return 0;
        }
        if (typeof this._option.data === 'string') {
            return 1;
        }
        let height = 0;
        for (let i = 0; i < this._option.data.length; i++) {
            height = Math.max(height, this._countHeight(this._option.data[i]));
        }
        return height;
    }

    getCells() {
        return this._cells;
    }

    private _initCells(): void {
        this._cells = [];
        for (let i = 0, rowId = 0, colId = 0; i < this._option.data.length; i++) {
            const node = this._option.data[i];
            const result = this._traverseInitCells(node, rowId, colId);
            rowId = result.rowId;
            colId = result.colId;
        }
    }

    private _traverseInitCells(node: MatrixNodeOption, rowId: number, colId: number = 0): { rowId: number, colId: number } {
        const cell: MatrixCell = {
            value: typeof node === 'string' ? node : node.value,
            rowId,
            colId,
            rowSpan: 1, // Assuming single rowSpan for now
            colSpan: node.children ? node.children.length : 1 // Assuming colSpan is the number of children
        };

        this._cells.push(cell);

        if (node.children) {
            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i];
                colId = this._traverseInitCells(child, rowId + 1, colId).colId;
            }
        }

        return { rowId, colId: colId + cell.colSpan };
    }

    private _countHeight(node: MatrixNodeOption): number {
        if (typeof node === 'string') {
            return 1;
        }
        let height = 0;
        for (let i = 0; i < node.children.length; i++) {
            height = Math.max(height, this._countHeight(node.children[i]));
        }
        return height + 1;
    }

    private _countLeaves(node: MatrixNodeOption): number {
        if (typeof node === 'string') {
            return 1;
        }
        let cnt = 0;
        for (let i = 0; i < node.children.length; i++) {
            cnt += this._countLeaves(node.children[i]);
        }
        return cnt;
    }

}
