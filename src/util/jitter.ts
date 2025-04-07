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
    r: number,
    next: JitterData | null,
    prev: JitterData | null
};

const inner = makeInner<{ items: JitterData }, Axis2D | SingleAxis>();

/**
 * JitterStorable is a mixin for Axis2D and SingleAxis with jitterOverlap being
 * `true`. It stores the jitter data for each axis so that the jittered data
 * points can avoid overlapping. If jitterOverlap is `false`, the jitter data
 * is not stored.
 * It's created in layout stage when data update.
 */
export interface JitterStorable {
    jitterStore: JitterData[]
}

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
    // Get band width to limit jitter range
    const bandWidth = fixedAxis.scale.type === 'ordinal'
        ? fixedAxis.getBandWidth()
        : null;
    if (jitter > 0) {
        if (jitterOverlap) {
            return fixJitterIgnoreOverlaps(floatCoord, jitter, bandWidth, radius);
        }
        else {
            return fixJitterAvoidOverlaps(fixedAxis, fixedCoord, floatCoord, radius, jitter, jitterMargin);
        }
    }
    return floatCoord;
}

function fixJitterIgnoreOverlaps(
    floatCoord: number,
    jitter: number,
    bandWidth: number | null,
    radius: number
): number {
    // Don't clamp single axis
    if (bandWidth === null) {
        return floatCoord + (Math.random() - 0.5) * jitter;
    }
    const maxJitter = bandWidth - radius * 2;
    const actualJitter = Math.min(Math.max(0, jitter), maxJitter);
    return floatCoord + (Math.random() - 0.5) * actualJitter;
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
        store.items = {
            fixedCoord: -1,
            floatCoord: -1,
            r: -1,
            next: null,
            prev: null
        };
        store.items.next = store.items;
        store.items.prev = store.items;
    }
    const items = store.items;

    const overlapA = placeJitterOnDirection(items, fixedCoord, floatCoord, radius, jitter, margin, 1);
    const overlapB = placeJitterOnDirection(items, fixedCoord, floatCoord, radius, jitter, margin, -1);
    const overlapResult = Math.abs(overlapA.resultCoord - floatCoord) < Math.abs(overlapB.resultCoord - floatCoord)
        ? overlapA : overlapB;
    let minFloat = overlapResult.resultCoord;
    // Clamp only category axis
    const bandWidth = fixedAxis.scale.type === 'ordinal'
        ? fixedAxis.getBandWidth()
        : null;
    const distance = Math.abs(minFloat - floatCoord);
    if (distance > jitter / 2
        || (bandWidth && distance > bandWidth / 2 - radius)
    ) {
        // If the new item is moved too far, then give up.
        // Fall back to random jitter.
        minFloat = fixJitterIgnoreOverlaps(floatCoord, jitter, bandWidth, radius);
    }

    // Insert to store
    const insertBy = overlapResult.insertBy;
    const resultDirection = overlapResult.direction;
    const pointer1 = resultDirection > 0 ? 'next' : 'prev';
    const pointer2 = resultDirection > 0 ? 'prev' : 'next';
    const newItem: JitterData = {
        fixedCoord: fixedCoord,
        floatCoord: overlapResult.resultCoord,
        r: radius,
        next: null,
        prev: null
    };
    newItem[pointer1] = insertBy[pointer1];
    newItem[pointer2] = insertBy;
    insertBy[pointer1][pointer2] = newItem;
    insertBy[pointer1] = newItem;

    return minFloat;
}

function placeJitterOnDirection(
    items: JitterData,
    fixedCoord: number,
    floatCoord: number,
    radius: number,
    jitter: number,
    margin: number,
    direction: 1 | -1
): {
    resultCoord: number;
    insertBy: JitterData;
    direction: 1 | -1;
} {
    // Check for overlap with previous items.
    let y = floatCoord;
    const pointer1 = direction > 0 ? 'next' : 'prev';
    let insertBy = items;
    let item = items[pointer1];

    while (item !== items) {
        const dx = fixedCoord - item.fixedCoord;
        const dy = y - item.floatCoord;
        const d2 = dx * dx + dy * dy;
        const r = radius + item.r + margin;
        if (d2 < r * r) {
            // Overlap. Try to move the new item along otherCoord direction.
            y = item.floatCoord + Math.sqrt(r * r - dx * dx) * direction;
            insertBy = item;

            if (Math.abs(y - floatCoord) > jitter / 2) {
                // If the new item is moved too far, then give up.
                // Fall back to random jitter.
                return {resultCoord: Number.MAX_VALUE, insertBy, direction};
            }
        }

        item = item[pointer1];
    }

    return {resultCoord: y, insertBy, direction};
}
