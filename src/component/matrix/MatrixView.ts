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

import MatrixModel, { MatrixBaseCellOption, MatrixCellStyleOption, MatrixOption } from '../../coord/matrix/MatrixModel';
import ComponentView from '../../view/Component';
import { MatrixCellLayoutInfo, MatrixDim, MatrixXYLocator } from '../../coord/matrix/MatrixDim';
import Model from '../../model/Model';
import { NullUndefined } from '../../util/types';
import BoundingRect, { RectLike } from 'zrender/src/core/BoundingRect';
import * as vectorUtil from 'zrender/src/core/vector';
import { RectShape } from 'zrender/src/graphic/shape/Rect';
import { ItemStyleProps } from '../../model/mixin/itemStyle';
import { LineStyleProps } from '../../model/mixin/lineStyle';
import { LineShape } from 'zrender/src/graphic/shape/Line';
import { subPixelOptimize } from 'zrender/src/graphic/helper/subPixelOptimize';
import { Group, Text, Rect, Line, XY, setTooltipConfig, expandOrShrinkRect } from '../../util/graphic';
import { clearTmpModel, ListIterator } from '../../util/model';
import { clone, retrieve2 } from 'zrender/src/core/util';
import { invert } from 'zrender/src/core/matrix';
import { MatrixBodyCorner, MatrixBodyOrCornerKind } from '../../coord/matrix/MatrixBodyCorner';
import { setLabelStyle } from '../../label/labelStyle';
import GlobalModel from '../../model/Global';

const round = Math.round;

// When special border style is defined on cell, it
// should be over all of the other borders.
type Z2CellDefault = {normal: number, special: number};
const Z2_BACKGROUND = 0;
const Z2_OUTER_BORDER = 99;
const Z2_BODY_CORNER_CELL_DEFAULT: Z2CellDefault = {normal: 25, special: 100};
const Z2_DIMENSION_CELL_DEFAULT: Z2CellDefault = {normal: 50, special: 125};

class MatrixView extends ComponentView {

    static type = 'matrix';
    type = MatrixView.type;

    render(matrixModel: MatrixModel, ecModel: GlobalModel) {

        this.group.removeAll();

        const group = this.group;
        const coordSys = matrixModel.coordinateSystem;
        const rect = coordSys.getRect();
        const xDimModel = matrixModel.getDimensionModel('x');
        const yDimModel = matrixModel.getDimensionModel('y');
        const xDim = xDimModel.dim;
        const yDim = yDimModel.dim;

        // PENDING:
        //  reuse the existing text and rect elements for performance?

        renderDimensionCells(
            group,
            matrixModel,
            ecModel
        );

        createBodyAndCorner(
            group,
            matrixModel,
            xDim,
            yDim,
            ecModel
        );

        const borderZ2Option = matrixModel.getShallow('borderZ2', true);
        const outerBorderZ2 = retrieve2(borderZ2Option, Z2_OUTER_BORDER);
        const dividerLineZ2 = outerBorderZ2 - 1;

        // Outer border and overall background. Use separate elements because of z-order:
        // The overall background should appear below any other elements.
        // But in most cases, the outer border and the divider line should be above the normal cell borders -
        // especially when cell borders have different colors. But users may highlight some specific cells by
        // overstirking their border, in which case it should be above the outer border.
        const bgStyle = matrixModel.getModel('backgroundStyle').getItemStyle(
            ['borderWidth']
        );
        bgStyle.lineWidth = 0;
        const borderStyle = matrixModel.getModel('backgroundStyle').getItemStyle(
            ['color', 'decal', 'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY']
        );
        borderStyle.fill = 'none';
        const bgRect = createMatrixRect(rect.clone(), bgStyle, Z2_BACKGROUND);
        const borderRect = createMatrixRect(rect.clone(), borderStyle, outerBorderZ2);
        bgRect.silent = true;
        borderRect.silent = true;
        group.add(bgRect);
        group.add(borderRect);

        // Header split line.
        const xDimCell0 = xDim.getUnitLayoutInfo(0, 0);
        const yDimCell0 = yDim.getUnitLayoutInfo(1, 0);
        if (xDimCell0 && yDimCell0) {
            if (xDim.shouldShow()) {
                group.add(createMatrixLine(
                    {
                        x1: rect.x,
                        y1: yDimCell0.xy,
                        x2: rect.x + rect.width,
                        y2: yDimCell0.xy,
                    },
                    xDimModel.getModel('dividerLineStyle').getLineStyle(),
                    dividerLineZ2,
                ));
            }
            if (yDim.shouldShow()) {
                group.add(createMatrixLine(
                    {
                        x1: xDimCell0.xy,
                        y1: rect.y,
                        x2: xDimCell0.xy,
                        y2: rect.y + rect.height,
                    },
                    yDimModel.getModel('dividerLineStyle').getLineStyle(),
                    dividerLineZ2,
                ));
            }
        }
    }
}

function renderDimensionCells(group: Group, matrixModel: MatrixModel, ecModel: GlobalModel): void {

    renderOnDimension(0);
    renderOnDimension(1);

    function renderOnDimension(dimIdx: 0 | 1) {
        const thisDimModel = matrixModel.getDimensionModel(XY[dimIdx]);
        const thisDim = thisDimModel.dim;

        if (!thisDim.shouldShow()) {
            return;
        }

        const thisDimBgStyleModel = thisDimModel.getModel('itemStyle');
        const thisDimLabelModel = thisDimModel.getModel('label');
        const tooltipOption = matrixModel.getShallow('tooltip', true);
        const xyLocator: MatrixXYLocator[] = [];

        for (const it = thisDim.resetCellIterator(); it.next();) {
            const dimCell = it.item;
            const shape = {} as RectLike;
            BoundingRect.copy(shape, dimCell.rect);

            vectorUtil.set(xyLocator, dimCell.id.x, dimCell.id.y);

            createMatrixCell(
                xyLocator,
                matrixModel,
                group,
                ecModel,
                dimCell.option,
                thisDimBgStyleModel,
                thisDimLabelModel,
                thisDimModel,
                shape,
                dimCell.option.value,
                Z2_DIMENSION_CELL_DEFAULT,
                tooltipOption
            );
        }
    }
}

function createBodyAndCorner(
    group: Group,
    matrixModel: MatrixModel,
    xDim: MatrixDim,
    yDim: MatrixDim,
    ecModel: GlobalModel
): void {

    createBodyOrCornerCells('body', matrixModel.getBody(), xDim, yDim);
    if (xDim.shouldShow() && yDim.shouldShow()) {
        createBodyOrCornerCells('corner', matrixModel.getCorner(), yDim, xDim);
    }

    function createBodyOrCornerCells<TBodyOrCornerKind extends MatrixBodyOrCornerKind>(
        bodyCornerOptionRoot: TBodyOrCornerKind,
        bodyOrCorner: MatrixBodyCorner<TBodyOrCornerKind>,
        dimForCoordX: MatrixDim, // Can be `matrix.y` (transposed) for corners.
        dimForCoordY: MatrixDim, // Can be `matrix.x` (trnasposed) for corners.
    ): void {
        // Prevent inheriting from ancestor.
        const parentCellModel = new Model(matrixModel.getShallow(bodyCornerOptionRoot, true));
        const parentItemStyleModel = parentCellModel.getModel('itemStyle');
        const parentLabelModel = parentCellModel.getModel('label');

        const itx = new ListIterator<MatrixCellLayoutInfo>();
        const ity = new ListIterator<MatrixCellLayoutInfo>();
        const xyLocator: number[] = [];
        const tooltipOption = matrixModel.getShallow('tooltip', true);

        for (dimForCoordY.resetLayoutIterator(ity, 1); ity.next();) {
            for (dimForCoordX.resetLayoutIterator(itx, 0); itx.next();) {
                const xLayout = itx.item;
                const yLayout = ity.item;

                vectorUtil.set(xyLocator, xLayout.id.x, yLayout.id.y);
                const bodyCornerCell = bodyOrCorner.getCell(xyLocator);

                // If in span of an other body or corner cell, never render it.
                if (bodyCornerCell && bodyCornerCell.inSpanOf && bodyCornerCell.inSpanOf !== bodyCornerCell) {
                    continue;
                }

                const shape = {} as RectLike;
                if (bodyCornerCell && bodyCornerCell.span) {
                    BoundingRect.copy(shape, bodyCornerCell.spanRect);
                }
                else {
                    xLayout.dim.getLayout(shape, 0, xyLocator[0]);
                    yLayout.dim.getLayout(shape, 1, xyLocator[1]);
                }

                const bodyCornerCellOption = bodyCornerCell ? bodyCornerCell.option : null;

                createMatrixCell(
                    xyLocator,
                    matrixModel,
                    group,
                    ecModel,
                    bodyCornerCellOption,
                    parentItemStyleModel,
                    parentLabelModel,
                    parentCellModel,
                    shape,
                    bodyCornerCellOption ? bodyCornerCellOption.value : null,
                    Z2_BODY_CORNER_CELL_DEFAULT,
                    tooltipOption
                );
            }
        }
    } // End of createBodyOrCornerCells
}

function createMatrixCell(
    xyLocator: MatrixXYLocator[],
    matrixModel: MatrixModel,
    group: Group,
    ecModel: GlobalModel,
    cellOption: MatrixBaseCellOption | NullUndefined,
    parentItemStyleModel: Model<MatrixCellStyleOption['itemStyle']>,
    parentLabelModel: Model<MatrixCellStyleOption['label']>,
    parentCellModel: Model<MatrixCellStyleOption>,
    shape: RectLike,
    textValue: unknown,
    zrCellDefault: Z2CellDefault,
    tooltipOption: MatrixOption['tooltip'],
): void {
    // Do not use getModel for handy performance optimization.
    _tmpCellItemStyleModel.option = cellOption ? cellOption.itemStyle : null;
    _tmpCellItemStyleModel.parentModel = parentItemStyleModel;
    _tmpCellModel.option = cellOption;
    _tmpCellModel.parentModel = parentCellModel;

    // Use different z2 because special border may be defined in itemStyle.
    const z2 = retrieve2(
        _tmpCellModel.getShallow('z2'),
        (cellOption && cellOption.itemStyle) ? zrCellDefault.special : zrCellDefault.normal
    );
    const tooltipOptionShow = tooltipOption && tooltipOption.show;

    const cellRect = createMatrixRect(shape, _tmpCellItemStyleModel.getItemStyle(), z2);
    group.add(cellRect);

    const cursorOption = _tmpCellModel.get('cursor');
    if (cursorOption != null) {
        cellRect.attr('cursor', cursorOption);
    }
    let cellText: Text | NullUndefined;

    if (textValue != null) {
        const text = textValue + '';
        _tmpCellLabelModel.option = cellOption ? cellOption.label : null;
        _tmpCellLabelModel.parentModel = parentLabelModel;
        // This is to accept `option.textStyle` as the default.
        _tmpCellLabelModel.ecModel = ecModel;

        setLabelStyle(
            cellRect,
            // Currently do not support other states (`emphasis`, `select`, `blur`)
            {normal: _tmpCellLabelModel},
            {
                defaultText: text,
                autoOverflowArea: true,
                // By default based on boundingRect. But boundingRect contains borderWidth,
                // and borderWidth is half outside the cell. Thus specific `layoutRect` explicitly.
                layoutRect: clone(cellRect.shape)
            },
        );
        cellText = cellRect.getTextContent();
        if (cellText) {
            cellText.z2 = z2 + 1;

            const style = cellText.style;
            if (style && (style.overflow && style.overflow !== 'none' && style.lineOverflow)) {
                // `overflow: 'break'/'breakAll'/'truncate'` does not guarantee prevention of overflow
                // when space is insufficient. Use a `clipPath` in such case.
                const clipShape = {} as RectLike;
                BoundingRect.copy(clipShape, shape);
                // `lineWidth` is half outside half inside the bounding rect.
                expandOrShrinkRect(clipShape, (cellRect.style?.lineWidth || 0) / 2, true, true);
                cellRect.updateInnerText();
                cellText.getLocalTransform(_tmpInnerTextTrans);
                invert(_tmpInnerTextTrans, _tmpInnerTextTrans);
                BoundingRect.applyTransform(clipShape, clipShape, _tmpInnerTextTrans);
                cellText.setClipPath(new Rect({shape: clipShape}));
            }
        }

        setTooltipConfig({ // At least for text overflow.
            el: cellRect,
            componentModel: matrixModel,
            itemName: text,
            itemTooltipOption: tooltipOption,
            formatterParamsExtra: {
                xyLocator: xyLocator.slice()
            }
        });
    }

    // Set silent
    if (cellText) {
        let labelSilent = _tmpCellLabelModel.get('silent');
        // auto, tooltip of text cells need silient: false, but non-text cells
        // do not need a special cursor in most cases.
        if (labelSilent == null) {
            labelSilent = !tooltipOptionShow;
        }
        cellText.silent = labelSilent;
        cellText.ignoreHostSilent = true;
    }
    let rectSilent = _tmpCellModel.get('silent');
    if (rectSilent == null) {
        rectSilent = (
            // If no background color in cell, set `rect.silent: false` will cause that only
            // the border response to mouse hovering, which is probably weird.
            !cellRect.style || cellRect.style.fill === 'none' || !cellRect.style.fill
        );
    }
    cellRect.silent = rectSilent;

    clearTmpModel(_tmpCellModel);
    clearTmpModel(_tmpCellItemStyleModel);
    clearTmpModel(_tmpCellLabelModel);
}
const _tmpCellModel = new Model<MatrixCellStyleOption>();
const _tmpCellItemStyleModel = new Model<MatrixCellStyleOption['itemStyle']>();
const _tmpCellLabelModel = new Model<MatrixCellStyleOption['label']>();
const _tmpInnerTextTrans: number[] = [];

// FIXME: move all of the subpixel process to Matrix.ts resize, otherwise the result of
// `dataToLayout` is not consistent with this rendering, and the caller (like heatmap) can
// not precisely align with the matrix border.
function createMatrixRect(
    shape: RectShape, style: ItemStyleProps, z2: number
): Rect {
    // Currently `subPixelOptimizeRect` can not be used here because it will break rect alignment.
    // Optimize line and rect with the same direction.
    const lineWidth = style.lineWidth;
    if (lineWidth) {
        const x2Original = shape.x + shape.width;
        const y2Original = shape.y + shape.height;
        shape.x = subPixelOptimize(shape.x, lineWidth, true);
        shape.y = subPixelOptimize(shape.y, lineWidth, true);
        shape.width = subPixelOptimize(x2Original, lineWidth, true) - shape.x;
        shape.height = subPixelOptimize(y2Original, lineWidth, true) - shape.y;
    }
    return new Rect({
        shape,
        style: style,
        z2,
    });
}

function createMatrixLine(shape: Omit<LineShape, 'percent'>, style: LineStyleProps, z2: number): Line {
    const lineWidth = style.lineWidth;
    if (lineWidth) {
        if (round(shape.x1 * 2) === round(shape.x2 * 2)) {
            shape.x1 = shape.x2 = subPixelOptimize(shape.x1, lineWidth, true);
        }
        if (round(shape.y1 * 2) === round(shape.y2 * 2)) {
            shape.y1 = shape.y2 = subPixelOptimize(shape.y1, lineWidth, true);
        }
    }
    return new Line({
        shape,
        style,
        silent: true,
        z2,
    });
}

export default MatrixView;
