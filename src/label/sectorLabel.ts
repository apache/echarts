import {calculateTextPosition, TextPositionCalculationResult} from 'zrender/src/contain/text';
import { RectLike } from 'zrender/src/core/BoundingRect';
import {BuiltinTextPosition, TextAlign, TextVerticalAlign} from 'zrender/src/core/types';
import {isArray} from 'zrender/src/core/util';
import {ElementCalculateTextPosition, ElementTextConfig} from 'zrender/src/Element';
import { Sector } from '../util/graphic';

export type SectorTextPosition = BuiltinTextPosition
    | 'startAngle' | 'insideStartAngle'
    | 'endAngle' | 'insideEndAngle'
    | 'middle'
    | 'startArc' | 'insideStartArc'
    | 'endArc' | 'insideEndArc'
    | (number | string)[];

export type SectorLike = {
    cx: number
    cy: number
    r0: number
    r: number
    startAngle: number
    endAngle: number
    clockwise: boolean
};

export function createSectorCalculateTextPosition<T extends (string | (number | string)[])>(
    positionMapping: (seriesLabelPosition: T) => SectorTextPosition
): ElementCalculateTextPosition {
    return function (
        this: Sector,
        out: TextPositionCalculationResult,
        opts: {
            position?: SectorTextPosition
            distance?: number
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

        const mappedSectorPosition = positionMapping(textPosition as T);
        const distance = opts.distance != null ? opts.distance : 5;
        const sector = this.shape;
        const cx = sector.cx;
        const cy = sector.cy;
        const r = sector.r;
        const r0 = sector.r0;
        const middleR = (r + r0) / 2;
        const startAngle = sector.startAngle;
        const endAngle = sector.endAngle;
        const middleAngle = (startAngle + endAngle) / 2;

        // base position: top-left
        let x = cx + r * Math.cos(startAngle);
        let y = cy + r * Math.sin(startAngle);

        let textAlign: TextAlign = 'left';
        let textVerticalAlign: TextVerticalAlign = 'top';

        switch (mappedSectorPosition) {
            case 'startArc':
                x = cx + (r0 - distance) * Math.cos(middleAngle);
                y = cy + (r0 - distance) * Math.sin(middleAngle);
                textAlign = 'center';
                textVerticalAlign = 'top';
                break;

            case 'insideStartArc':
                x = cx + (r0 + distance) * Math.cos(middleAngle);
                y = cy + (r0 + distance) * Math.sin(middleAngle);
                textAlign = 'center';
                textVerticalAlign = 'bottom';
                break;

            case 'startAngle':
                x = cx + middleR * Math.cos(startAngle)
                    + adjustAngleDistanceX(startAngle, distance, false);
                y = cy + middleR * Math.sin(startAngle)
                    + adjustAngleDistanceY(startAngle, distance, false);
                textAlign = 'right';
                textVerticalAlign = 'middle';
                break;

            case 'insideStartAngle':
                x = cx + middleR * Math.cos(startAngle)
                    + adjustAngleDistanceX(startAngle, -distance, false);
                y = cy + middleR * Math.sin(startAngle)
                    + adjustAngleDistanceY(startAngle, -distance, false);
                textAlign = 'left';
                textVerticalAlign = 'middle';
                break;

            case 'middle':
                x = cx + middleR * Math.cos(middleAngle);
                y = cy + middleR * Math.sin(middleAngle);
                textAlign = 'center';
                textVerticalAlign = 'middle';
                break;

            case 'endArc':
                x = cx + (r + distance) * Math.cos(middleAngle);
                y = cy + (r + distance) * Math.sin(middleAngle);
                textAlign = 'center';
                textVerticalAlign = 'bottom';
                break;

            case 'insideEndArc':
                x = cx + (r - distance) * Math.cos(middleAngle);
                y = cy + (r - distance) * Math.sin(middleAngle);
                textAlign = 'center';
                textVerticalAlign = 'top';
                break;

            case 'endAngle':
                x = cx + middleR * Math.cos(endAngle)
                    + adjustAngleDistanceX(endAngle, distance, true);
                y = cy + middleR * Math.sin(endAngle)
                    + adjustAngleDistanceY(endAngle, distance, true);
                textAlign = 'left';
                textVerticalAlign = 'middle';
                break;

            case 'insideEndAngle':
                x = cx + middleR * Math.cos(endAngle)
                    + adjustAngleDistanceX(endAngle, -distance, true);
                y = cy + middleR * Math.sin(endAngle)
                    + adjustAngleDistanceY(endAngle, -distance, true);
                textAlign = 'right';
                textVerticalAlign = 'middle';
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

export function setSectorTextRotation<T extends (string | (number | string)[])>(
    sector: Sector,
    textPosition: T,
    positionMapping: (seriesLabelPosition: T) => SectorTextPosition,
    rotateType: number | 'auto'
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
    const mappedSectorPosition = positionMapping(textPosition);
    switch (mappedSectorPosition) {
        case 'startArc':
        case 'insideStartArc':
        case 'middle':
        case 'insideEndArc':
        case 'endArc':
            anchorAngle = middleAngle;
            break;

        case 'startAngle':
        case 'insideStartAngle':
            anchorAngle = startAngle;
            break;

        case 'endAngle':
        case 'insideEndAngle':
            anchorAngle = endAngle;
            break;

        default:
            sector.setTextConfig({
                rotation: 0
            });
            return;
    }

    let rotate = Math.PI * 1.5 - anchorAngle;
    /**
     * TODO: labels with rotate > Math.PI / 2 should be rotate another
     * half round flipped to increase readability. However, only middle
     * position supports this for now, because in other positions, the
     * anchor point is not at the center of the text, so the positions
     * after rotating is not as expected.
     */
    if (mappedSectorPosition === 'middle' && rotate > Math.PI / 2 && rotate < Math.PI * 1.5) {
        rotate -= Math.PI;
    }

    sector.setTextConfig({
        rotation: rotate
    });
}

function adjustAngleDistanceX(angle: number, distance: number, isEnd: boolean) {
    return distance * Math.sin(angle) * (isEnd ? -1 : 1);
}

function adjustAngleDistanceY(angle: number, distance: number, isEnd: boolean) {
    return distance * Math.cos(angle) * (isEnd ? 1 : -1);
}
