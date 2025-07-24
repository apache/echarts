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

import type Axis from '../coord/Axis';
import type { AxisBaseModel } from '../coord/AxisBaseModel';
import Axis2D from '../coord/cartesian/Axis2D';
import type SingleAxis from '../coord/single/SingleAxis';
import type SeriesModel from '../model/Series';
import { makeInner } from './model';

export function needFixJitter(seriesModel: SeriesModel, axis: Axis): boolean {
    const coordinateSystem = seriesModel.coordinateSystem;
    const coordType = coordinateSystem && coordinateSystem.type;
    const baseAxis = coordinateSystem && coordinateSystem.getBaseAxis && coordinateSystem.getBaseAxis();
    const scaleType = baseAxis && baseAxis.scale && baseAxis.scale.type;
    const seriesValid = coordType === 'cartesian2d' && scaleType === 'ordinal'
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
        store.items = [];
    }
    const items = store.items;

    // Try both positive and negative directions, choose the one with smaller movement
    const overlapA = placeJitterOnDirection(items, fixedCoord, floatCoord, radius, jitter, margin, 1);
    const overlapB = placeJitterOnDirection(items, fixedCoord, floatCoord, radius, jitter, margin, -1);
    const minFloat = Math.abs(overlapA - floatCoord) < Math.abs(overlapB - floatCoord) ? overlapA : overlapB;

    // Clamp only category axis
    const bandWidth = fixedAxis.scale.type === 'ordinal'
        ? fixedAxis.getBandWidth()
        : null;
    const distance = Math.abs(minFloat - floatCoord);

    if (distance > jitter / 2 || (bandWidth && distance > bandWidth / 2 - radius)) {
        // If the new item is moved too far, then give up.
        // Fall back to random jitter.
        return fixJitterIgnoreOverlaps(floatCoord, jitter, bandWidth, radius);
    }

    // Add new point to array
    items.push({
        fixedCoord: fixedCoord,
        floatCoord: minFloat,
        r: radius
    });

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
): number {
    let y = floatCoord;

    // Check all existing items for overlap and find the maximum adjustment needed
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const dx = fixedCoord - item.fixedCoord;
        const dy = y - item.floatCoord;
        const d2 = dx * dx + dy * dy;
        const r = radius + item.r + margin;

        if (d2 < r * r) {
            // Has overlap, calculate required adjustment
            const requiredY = item.floatCoord + Math.sqrt(r * r - dx * dx) * direction;

            // Check if this adjustment would move too far
            if (Math.abs(requiredY - floatCoord) > jitter / 2) {
                return Number.MAX_VALUE; // Give up
            }

            // Update y only when it's larger to the center
            if (direction === 1 && requiredY > y || direction === -1 && requiredY < y) {
                y = requiredY;
                // Loop from the start again
                i = -1; // Reset index to recheck all items
                continue; // Recalculate with the new y position
            }
        }
    }

    return y;
}
