import type Axis from '../coord/Axis';
import type { AxisBaseModel } from '../coord/AxisBaseModel';
import Axis2D from '../coord/cartesian/Axis2D';
import type SingleAxis from '../coord/single/SingleAxis';
import type SeriesModel from '../model/Series';
import { makeInner } from './model';

export function needFixJitter(seriesModel: SeriesModel, axis: Axis): boolean {
    const { coordinateSystem } = seriesModel;
    const { type: coordType } = coordinateSystem;
    const baseAxis = coordinateSystem.getBaseAxis();
    const { type: scaleType } = baseAxis.scale;
    const seriesValid = coordType === 'cartesian2d'
        && (scaleType === 'category' || scaleType === 'ordinal')
        || coordType === 'single';

    const axisValid = (axis.model as AxisBaseModel).get('jitter') > 0;
    return seriesValid && axisValid;
}

export type JitterData = {
    fixedCoord: number,
    floatCoord: number,
    r: number
};

const inner = makeInner<{ items: JitterData[] }, Axis2D | SingleAxis>();

/**
 * Fix jitter for overlapping data points.
 *
 * @param fixedAxis The axis whose coord doesn't change with jitter.
 * @param fixedCoord The coord of fixedAxis.
 * @param floatCoord The coord of the other axis, which should be changed with jittering.
 * @param radius The radius of the data point, considering the symbol is a circle.
 * @returns updated floatCoord.
 */
export function fixJitter(
    fixedAxis: Axis2D | SingleAxis,
    fixedCoord: number,
    floatCoord: number,
    radius: number
): number {
    if (fixedAxis instanceof Axis2D) {
        const scaleType = fixedAxis.scale.type;
        if (scaleType !== 'category' && scaleType !== 'ordinal') {
            return floatCoord;
        }
    }
    const axisModel = fixedAxis.model as AxisBaseModel;
    const jitter = axisModel.get('jitter');
    const jitterOverlap = axisModel.get('jitterOverlap');
    const jitterMargin = axisModel.get('jitterMargin') || 0;
    if (jitter > 0) {
        if (jitterOverlap) {
            return fixJitterIgnoreOverlaps(floatCoord, jitter);
        }
        else {
            return fixJitterAvoidOverlaps(fixedAxis, fixedCoord, floatCoord, radius, jitter, jitterMargin);
        }
    }
    return floatCoord;
}

function fixJitterIgnoreOverlaps(floatCoord: number, jitter: number): number {
    return floatCoord + (Math.random() - 0.5) * jitter;
}

function fixJitterAvoidOverlaps(
    fixedAxis: Axis2D | SingleAxis,
    fixedCoord: number,
    floatCoord: number,
    radius: number,
    jitter: number,
    margin: number
): number {
    const store = inner(fixedAxis);
    if (!store.items) {
        store.items = [];
    }
    const items = store.items;

    const floatA = placeJitterOnDirection(items, fixedCoord, floatCoord, radius, jitter, margin, 1);
    const floatB = placeJitterOnDirection(items, fixedCoord, floatCoord, radius, jitter, margin, -1);
    let minFloat = Math.abs(floatA - floatCoord) < Math.abs(floatB - floatCoord) ? floatA : floatB;
    if (Math.abs(minFloat - floatCoord) > jitter / 2) {
        // If the new item is moved too far, then give up.
        // Fall back to random jitter.
        minFloat = fixJitterIgnoreOverlaps(floatCoord, jitter);
    }

    items.push({ fixedCoord, floatCoord: minFloat, r: radius });
    return minFloat;
}

function placeJitterOnDirection(
    items: JitterData[],
    fixedCoord: number,
    floatCoord: number,
    radius: number,
    jitter: number,
    margin: number,
    direction: 1 | -1
) {
    // Check for overlap with previous items.
    let y = floatCoord;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const dx = fixedCoord - item.fixedCoord;
        const dy = y - item.floatCoord;
        const d2 = dx * dx + dy * dy;
        const r = radius + item.r + margin;
        if (d2 < r * r) {
            // Overlap. Try to move the new item along otherCoord direction.
            const newY = item.floatCoord + Math.sqrt(r * r - dx * dx) * direction;
            if (direction > 0 && newY > y || direction < 0 && newY < y) {
                y = newY;
                i = 0; // Back to check from the first item.
            }

            if (Math.abs(newY - floatCoord) > jitter / 2) {
                // If the new item is moved too far, then give up.
                // Fall back to random jitter.
                return Number.MAX_VALUE;
            }
        }
    }
    return y;
}
