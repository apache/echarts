import {RectLike, Sector} from 'zrender';
import {calculateTextPosition, parsePercent, TextPositionCalculationResult} from 'zrender/src/contain/text';
import {BuiltinTextPosition, TextAlign, TextVerticalAlign} from 'zrender/src/core/types';
import {isArray} from 'zrender/src/core/util';
import {ElementCalculateTextPosition, ElementTextConfig} from 'zrender/src/Element';

export type SectorTextPosition = BuiltinTextPosition
    | 'start' | 'insideStart' | 'middle' | 'insideEnd' | 'end';

export type SectorLike = {
    cx: number
    cy: number
    r0: number
    r: number
    startAngle: number
    endAngle: number
    clockwise: boolean
};

export function createSectorCalculateTextPosition(isRadial: boolean): ElementCalculateTextPosition {
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
                if (isRadial) {
                    x = cx + (r0 - distance) * Math.cos(middleAngle);
                    y = cy + (r0 - distance) * Math.sin(middleAngle);
                    textAlign = 'center';
                    textVerticalAlign = 'top';
                }
                else {
                    x = cx + middleR * Math.cos(startAngle)
                        + adjustAngleDistanceX(startAngle, distance, false);
                    y = cy + middleR * Math.sin(startAngle)
                        + adjustAngleDistanceY(startAngle, distance, false);
                    textAlign = 'right';
                    textVerticalAlign = 'middle';
                }
                break;
            case 'insideStart':
                if (isRadial) {
                    x = cx + (r0 + distance) * Math.cos(middleAngle);
                    y = cy + (r0 + distance) * Math.sin(middleAngle);
                    textAlign = 'center';
                    textVerticalAlign = 'bottom';
                }
                else {
                    x = cx + middleR * Math.cos(startAngle)
                        + adjustAngleDistanceX(startAngle, -distance, false);
                    y = cy + middleR * Math.sin(startAngle)
                        + adjustAngleDistanceY(startAngle, -distance, false);
                    textAlign ='left';
                    textVerticalAlign = 'middle';
                }
                break;
            case 'middle':
                x = cx + middleR * Math.cos(middleAngle);
                y = cy + middleR * Math.sin(middleAngle);
                textAlign = 'center';
                textVerticalAlign = 'middle';
                break;
            case 'insideEnd':
                if (isRadial) {
                    x = cx + (r - distance) * Math.cos(middleAngle);
                    y = cy + (r - distance) * Math.sin(middleAngle);
                    textAlign = 'center';
                    textVerticalAlign = 'top';
                }
                else {
                    x = cx + middleR * Math.cos(endAngle)
                        + adjustAngleDistanceX(endAngle, -distance, true);
                    y = cy + middleR * Math.sin(endAngle)
                        + adjustAngleDistanceY(endAngle, -distance, true);
                    textAlign = 'right';
                    textVerticalAlign = 'middle';
                }
                break;
            case 'end':
                if (isRadial) {
                    x = cx + (r + distance) * Math.cos(middleAngle);
                    y = cy + (r + distance) * Math.sin(middleAngle);
                    textAlign = 'center';
                    textVerticalAlign = 'bottom';
                }
                else {
                    x = cx + middleR * Math.cos(endAngle)
                        + adjustAngleDistanceX(endAngle, distance, true);
                    y = cy + middleR * Math.sin(endAngle)
                        + adjustAngleDistanceY(endAngle, distance, true);
                    textAlign = 'left';
                    textVerticalAlign = 'middle';
                }
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

export function setSectorTextRotation(
    sector: Sector,
    textPosition: SectorTextPosition | (number | string)[],
    rotateType: number | 'auto',
    isRadial: boolean
) {
    if (typeof rotateType === 'number') {
        // user-set rotation
        sector.setTextConfig({
            rotation: rotateType
        });
        return;
    }
    else if (isArray(textPosition)) {
        // user-set position, use 0 as auto rotation
        sector.setTextConfig({
            rotation: 0
        });
        return;
    }

    const shape = sector.shape;
    const startAngle = shape.clockwise ? shape.startAngle : shape.endAngle;
    const endAngle = shape.clockwise ? shape.endAngle : shape.startAngle;
    const middleAngle = (startAngle + endAngle) / 2;

    let anchorAngle;
    switch (textPosition) {
        case 'start':
        case 'insideStart':
            anchorAngle = isRadial ? middleAngle : startAngle;
            break;
        case 'middle':
            anchorAngle = middleAngle;
            break;
        case 'insideEnd':
        case 'end':
            anchorAngle = isRadial ? middleAngle : endAngle;
            break;
        default:
            sector.setTextConfig({
                rotation: 0
            });
            return;
    }

    sector.setTextConfig({
        rotation: Math.PI * 1.5 - anchorAngle
    });
}

function adjustAngleDistanceX(angle: number, distance: number, isEnd: boolean) {
    return distance * Math.sin(angle) * (isEnd ? -1 : 1);
}

function adjustAngleDistanceY(angle: number, distance: number, isEnd: boolean) {
    return distance * Math.cos(angle) * (isEnd ? 1 : -1);
}
