import { AxisBaseModel } from '../coord/AxisBaseModel';
import Axis2D from '../coord/cartesian/Axis2D';
import SingleAxis from '../coord/single/SingleAxis';
import SeriesModel from '../model/Series';
import { makeInner } from './model';

export function needFixJitter(seriesModel: SeriesModel): boolean {
    const { coordinateSystem } = seriesModel;
    const { type: coordType } = coordinateSystem;
    const baseAxis = coordinateSystem.getBaseAxis();
    const { type: scaleType } = baseAxis.scale;

    return coordType === 'cartesian2d'
        && (scaleType === 'category' || scaleType === 'ordinal')
        || coordType === 'single';
}

export function fixJitter(itemLayout: [number, number]) {

    return itemLayout;
}

// type JitterParams = {
//     baseCoord: number,
//     otherCoord: number,
//     r: number
// };

// const inner = makeInner<{ items: JitterParams[] }, Axis2D | SingleAxis>();

// export function fixJitter(
//     baseAxis: Axis2D | SingleAxis,
//     baseCoord: number,
//     otherCoord: number,
//     radius: number
// ): number {
//     if (baseAxis instanceof Axis2D) {
//         const scaleType = baseAxis.scale.type;
//         if (scaleType !== 'category' && scaleType !== 'ordinal') {
//             return baseCoord;
//         }
//     }
//     const axisModel = baseAxis.model as AxisBaseModel;
//     const jitter = axisModel.get('jitter');
//     const jitterOverlap = axisModel.get('jitterOverlap');
//     const jitterMargin = axisModel.get('jitterMargin') || 0;
//     if (jitter > 0) {
//         if (jitterOverlap) {
//             return fixJitterIgnoreOverlaps(baseCoord, jitter);
//         }
//         else {
//             return fixJitterAvoidOverlaps(baseAxis, baseCoord, otherCoord, radius, jitterMargin);
//         }
//     }
//     return baseCoord;
// }

// function fixJitterIgnoreOverlaps(baseCoord: number, jitter: number): number {
//     return baseCoord + (Math.random() - 0.5) * jitter;
// }

// function fixJitterAvoidOverlaps(
//     baseAxis: Axis2D | SingleAxis,
//     baseCoord: number,
//     otherCoord: number,
//     radius: number,
//     margin: number
// ): number {
//     const store = inner(baseAxis);
//     if (!store.items) {
//         store.items = [];
//     }
//     const items = store.items;
//     console.log(items);

//     if (items.length === 0) {
//         items.push({ baseCoord: baseCoord, otherCoord: otherCoord, r: radius });
//         return baseCoord;
//     }
//     else {
//         return 0;
//     }
// }
