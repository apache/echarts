import { each } from 'zrender/src/core/util';
import SeriesData from '../../data/SeriesData';
import { graphic, SeriesModel } from '../../echarts.all';
import * as symbolUtil from '../../util/symbol';
import { LineDataVisual } from '../../visual/commonVisualTypes';
import { PathStyleProps } from 'zrender/src/graphic/Path';
import { SPECIAL_STATES } from '../../util/states';

export const SYMBOL_CATEGORIES = ['fromSymbol', 'toSymbol'] as const;

export type LineList = SeriesData<SeriesModel, LineDataVisual>;
export type LineECSymbol = symbolUtil.ECSymbol & {
    __specifiedRotation: number
};
export type ECSymbol = ReturnType<typeof createSymbol>;

export function createSymbol(
    name: 'fromSymbol' | 'toSymbol',
    lineData: SeriesData<SeriesModel, LineDataVisual>,
    idx: number) {
    const symbolType = lineData.getItemVisual(idx, name);
    if (!symbolType || symbolType === 'none') {
        return;
    }

    const symbolSize = lineData.getItemVisual(idx, name + 'Size' as 'fromSymbolSize' | 'toSymbolSize');
    const symbolRotate = lineData.getItemVisual(idx, name + 'Rotate' as 'fromSymbolRotate' | 'toSymbolRotate');
    const symbolOffset = lineData.getItemVisual(idx, name + 'Offset' as 'fromSymbolOffset' | 'toSymbolOffset');
    const symbolKeepAspect = lineData.getItemVisual(idx,
        name + 'KeepAspect' as 'fromSymbolKeepAspect' | 'toSymbolKeepAspect');

    const symbolSizeArr = symbolUtil.normalizeSymbolSize(symbolSize);

    const symbolOffsetArr = symbolUtil.normalizeSymbolOffset(symbolOffset || 0, symbolSizeArr);

    const symbolPath = symbolUtil.createSymbol(
        symbolType,
        -symbolSizeArr[0] / 2 + (symbolOffsetArr as number[])[0],
        -symbolSizeArr[1] / 2 + (symbolOffsetArr as number[])[1],
        symbolSizeArr[0],
        symbolSizeArr[1],
        null,
        symbolKeepAspect
    );

    (symbolPath as LineECSymbol).__specifiedRotation = symbolRotate == null || isNaN(symbolRotate)
        ? void 0
        : +symbolRotate * Math.PI / 180 || 0;

    symbolPath.name = name;

    return symbolPath;
}

export function makeSymbolTypeKey(symbolCategory: 'fromSymbol' | 'toSymbol') {
    return '_' + symbolCategory + 'Type' as '_fromSymbolType' | '_toSymbolType';
}

export function makeSymbolTypeValue(name: 'fromSymbol' | 'toSymbol', lineData: LineList, idx: number) {
    const symbolType = lineData.getItemVisual(idx, name);
    if (!symbolType || symbolType === 'none') {
        return symbolType;
    }

    const symbolSize = lineData.getItemVisual(idx, name + 'Size' as 'fromSymbolSize' | 'toSymbolSize');
    const symbolRotate = lineData.getItemVisual(idx, name + 'Rotate' as 'fromSymbolRotate' | 'toSymbolRotate');
    const symbolOffset = lineData.getItemVisual(idx, name + 'Offset' as 'fromSymbolOffset' | 'toSymbolOffset');
    const symbolKeepAspect = lineData.getItemVisual(idx,
        name + 'KeepAspect' as 'fromSymbolKeepAspect' | 'toSymbolKeepAspect');

    const symbolSizeArr = symbolUtil.normalizeSymbolSize(symbolSize);
    const symbolOffsetArr = symbolUtil.normalizeSymbolOffset(symbolOffset || 0, symbolSizeArr);

    return symbolType + symbolSizeArr + symbolOffsetArr + (symbolRotate || '') + (symbolKeepAspect || '');
}

export function updateSymbol(this: graphic.Group, lineStyle: PathStyleProps, line: graphic.Polyline | graphic.Line) {
    const visualColor = lineStyle.stroke;
    each(SYMBOL_CATEGORIES, function (symbolCategory) {
        const symbol = this.childOfName(symbolCategory) as ECSymbol;
        if (symbol) {
            // Share opacity and color with line.
            symbol.setColor(visualColor);
            symbol.style.opacity = lineStyle.opacity;

            for (let i = 0; i < SPECIAL_STATES.length; i++) {
                const stateName = SPECIAL_STATES[i];
                const lineState = line.getState(stateName);
                if (lineState) {
                    const lineStateStyle = lineState.style || {};
                    const state = symbol.ensureState(stateName);
                    const stateStyle = state.style || (state.style = {});
                    if (lineStateStyle.stroke != null) {
                        stateStyle[symbol.__isEmptyBrush ? 'stroke' : 'fill'] = lineStateStyle.stroke;
                    }
                    if (lineStateStyle.opacity != null) {
                        stateStyle.opacity = lineStateStyle.opacity;
                    }
                }
            }

            symbol.markRedraw();
        }
    }, this);
}