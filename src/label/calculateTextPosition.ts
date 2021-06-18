import {RectLike, Sector} from 'zrender';
import {calculateTextPosition, TextPositionCalculationResult} from 'zrender/src/contain/text';
import {BuiltinTextPosition, TextAlign, TextVerticalAlign} from 'zrender/src/core/types';
import {ElementCalculateTextPosition, ElementTextConfig} from 'zrender/src/Element';

export type SectorTextPosition = BuiltinTextPosition
    | 'start' | 'end'
    | 'startTop' | 'insideStartTop' | 'insideStart' | 'insideStartBottom' | 'startBottom'
    | 'middleTop' | 'insideMiddleTop' | 'middle' | 'insideMiddleBottom' | 'middleBottom'
    | 'endTop' | 'insideEndTop' | 'insideEnd' | 'insideEndBottom' | 'endBottom';

export type SectorLike = {
    cx: number
    cy: number
    r0: number
    r: number
    startAngle: number
    endAngle: number
    clockwise: boolean
};

export function createSectorCalculateTextPosition(): ElementCalculateTextPosition {
    return function (
        this: Sector,
        out: TextPositionCalculationResult,
        opts: {
            position?: SectorTextPosition | (number | string)[]
            distance?: number   // Default 5
            global?: boolean
        },
        boundingRect: RectLike
    ) {
        const textPosition = opts.position;

        if (!textPosition || textPosition instanceof Array) {
            return calculateTextPosition(
                out,
                opts as ElementTextConfig,
                boundingRect
            );
        }

        const distance = opts.distance != null ? opts.distance : 5;
        const sector = this.shape;
        const cx = sector.cx;
        const cy = sector.cy;
        const r = sector.r;
        const r0 = sector.r0;
        const middleR = (r + r0) / 2;
        const startAngle = sector.clockwise ? sector.startAngle : sector.endAngle;
        const endAngle = sector.clockwise ? sector.endAngle : sector.startAngle;
        const middleAngle = (startAngle + endAngle) / 2;

        // base position: top-left
        let x = cx + r * Math.cos(startAngle);
        let y = cy + r * Math.sin(startAngle);

        let textAlign: TextAlign = 'left';
        let textVerticalAlign: TextVerticalAlign = 'top';

        switch (textPosition) {
            case 'start':
                x = cx + middleR * Math.cos(startAngle);
                y = cy + middleR * Math.sin(startAngle);
                textAlign = fixAlign('right', startAngle);
                textVerticalAlign = fixVerticalAlign('middle', startAngle);
                break;
            case 'end':
                x = cx + middleR * Math.cos(endAngle);
                y = cy + middleR * Math.sin(endAngle);
                textAlign = fixAlign('left', endAngle);
                textVerticalAlign = fixVerticalAlign('middle', endAngle);
                break;

            case 'startTop':
                x = cx + (r + distance) * Math.cos(startAngle);
                y = cy + (r + distance) * Math.sin(startAngle);
                textAlign = fixAlign('left', startAngle);
                textVerticalAlign = fixVerticalAlign('bottom', startAngle);
                break;
            case 'insideStartTop':
                x = cx + (r - distance) * Math.cos(startAngle);
                y = cy + (r - distance) * Math.sin(startAngle);
                textAlign = fixAlign('left', startAngle);
                textVerticalAlign = fixVerticalAlign('top', startAngle);
                break;
            case 'insideStart':
                x = cx + middleR * Math.cos(startAngle);
                y = cy + middleR * Math.sin(startAngle);
                textAlign = fixAlign('left', startAngle);
                textVerticalAlign = fixVerticalAlign('middle', startAngle);
                break;
            case 'insideStartBottom':
                x = cx + (r0 + distance) * Math.cos(startAngle);
                y = cy + (r0 + distance) * Math.sin(startAngle);
                textAlign = fixAlign('left', startAngle);
                textVerticalAlign = fixVerticalAlign('bottom', startAngle);
                break;
            case 'startBottom':
                x = cx + (r0 - distance) * Math.cos(startAngle);
                y = cy + (r0 - distance) * Math.sin(startAngle);
                textAlign = fixAlign('left', startAngle);
                textVerticalAlign = fixVerticalAlign('top', startAngle);
                break;

            case 'middleTop':
                x = cx + (r + distance) * Math.cos(middleAngle);
                y = cy + (r + distance) * Math.sin(middleAngle);
                textAlign = fixAlign('center', middleAngle);
                textVerticalAlign = fixVerticalAlign('bottom', middleAngle);
                break;
            case 'insideMiddleTop':
                x = cx + (r - distance) * Math.cos(middleAngle);
                y = cy + (r - distance) * Math.sin(middleAngle);
                textAlign = fixAlign('center', middleAngle);
                textVerticalAlign = fixVerticalAlign('top', middleAngle);
                break;
            case 'middle':
                x = cx + middleR * Math.cos(middleAngle);
                y = cy + middleR * Math.sin(middleAngle);
                textAlign = fixAlign('center', middleAngle);
                textVerticalAlign = fixVerticalAlign('middle', middleAngle);
                break;
            case 'insideMiddleBottom':
                x = cx + (r0 + distance) * Math.cos(middleAngle);
                y = cy + (r0 + distance) * Math.sin(middleAngle);
                textAlign = fixAlign('center', middleAngle);
                textVerticalAlign = fixVerticalAlign('bottom', middleAngle);
                break;
            case 'middleBottom':
                x = cx + (r0 - distance) * Math.cos(middleAngle);
                y = cy + (r0 - distance) * Math.sin(middleAngle);
                textAlign = fixAlign('center', middleAngle);
                textVerticalAlign = fixVerticalAlign('top', middleAngle);
                break;

            case 'endTop':
                x = cx + (r + distance) * Math.cos(endAngle);
                y = cy + (r + distance) * Math.sin(endAngle);
                textAlign = fixAlign('right', endAngle);
                textVerticalAlign = fixVerticalAlign('bottom', endAngle);
            case 'insideEndTop':
                x = cx + (r - distance) * Math.cos(endAngle);
                y = cy + (r - distance) * Math.sin(endAngle);
                textAlign = fixAlign('right', endAngle);
                textVerticalAlign = fixVerticalAlign('top', endAngle);
                break;
            case 'insideEnd':
                x = cx + middleR * Math.cos(endAngle);
                y = cy + middleR * Math.sin(endAngle);
                textAlign = fixAlign('right', endAngle);
                textVerticalAlign = fixVerticalAlign('middle', endAngle);
                break;
            case 'insideEndBottom':
                x = cx + (r0 + distance) * Math.cos(endAngle);
                y = cy + (r0 + distance) * Math.sin(endAngle);
                textAlign = fixAlign('right', endAngle);
                textVerticalAlign = fixVerticalAlign('bottom', endAngle);
                break;
            case 'endBottom':
                x = cx + (r0 - distance) * Math.cos(endAngle);
                y = cy + (r0 - distance) * Math.sin(endAngle);
                textAlign = fixAlign('right', endAngle);
                textVerticalAlign = fixVerticalAlign('top', endAngle);
                break;
            default:
                return calculateTextPosition(
                    out,
                    opts as ElementTextConfig,
                    boundingRect
                );
        }

        out = out || {} as TextPositionCalculationResult;
        out.x = x;
        out.y = y;
        out.align = textAlign;
        out.verticalAlign = textVerticalAlign;

        return out;
    };
}

function fixAlign(align: TextAlign, angle: number) {
    if (angle > Math.PI / 2) {
        return align === 'left'
            ? 'right'
            : (align === 'right' ? 'left' : align);
    }
    return align;
}

function fixVerticalAlign(align: TextVerticalAlign, angle: number) {
    if (angle > 0 && angle <= Math.PI) {
        return align === 'top'
            ? 'bottom'
            : (align === 'bottom' ? 'top' : align);
    }
    return align;
}
