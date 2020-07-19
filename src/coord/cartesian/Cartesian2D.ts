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


import BoundingRect from 'zrender/src/core/BoundingRect';
import Cartesian from './Cartesian';
import { ScaleDataValue } from '../../util/types';
import Axis2D from './Axis2D';
import { CoordinateSystem } from '../CoordinateSystem';
import GridModel from './GridModel';
import Grid from './Grid';

export const cartesian2DDimensions = ['x', 'y'];

class Cartesian2D extends Cartesian<Axis2D> implements CoordinateSystem {

    readonly type = 'cartesian2d';

    readonly dimensions = cartesian2DDimensions;

    model: GridModel;

    master: Grid;

    /**
     * Base axis will be used on stacking.
     */
    getBaseAxis(): Axis2D {
        return this.getAxesByScale('ordinal')[0]
            || this.getAxesByScale('time')[0]
            || this.getAxis('x');
    }

    containPoint(point: number[]): boolean {
        const axisX = this.getAxis('x');
        const axisY = this.getAxis('y');
        return axisX.contain(axisX.toLocalCoord(point[0]))
            && axisY.contain(axisY.toLocalCoord(point[1]));
    }

    containData(data: ScaleDataValue[]): boolean {
        return this.getAxis('x').containData(data[0])
            && this.getAxis('y').containData(data[1]);
    }

    dataToPoint(data: ScaleDataValue[], reserved?: unknown, out?: number[]): number[] {
        const xAxis = this.getAxis('x');
        const yAxis = this.getAxis('y');
        out = out || [];
        out[0] = xAxis.toGlobalCoord(xAxis.dataToCoord(data[0]));
        out[1] = yAxis.toGlobalCoord(yAxis.dataToCoord(data[1]));
        return out;
    }

    clampData(data: ScaleDataValue[], out?: number[]): number[] {
        const xScale = this.getAxis('x').scale;
        const yScale = this.getAxis('y').scale;
        const xAxisExtent = xScale.getExtent();
        const yAxisExtent = yScale.getExtent();
        const x = xScale.parse(data[0]);
        const y = yScale.parse(data[1]);
        out = out || [];
        out[0] = Math.min(
            Math.max(Math.min(xAxisExtent[0], xAxisExtent[1]), x),
            Math.max(xAxisExtent[0], xAxisExtent[1])
        );
        out[1] = Math.min(
            Math.max(Math.min(yAxisExtent[0], yAxisExtent[1]), y),
            Math.max(yAxisExtent[0], yAxisExtent[1])
        );

        return out;
    }

    pointToData(point: number[], out?: number[]): number[] {
        const xAxis = this.getAxis('x');
        const yAxis = this.getAxis('y');
        out = out || [];
        out[0] = xAxis.coordToData(xAxis.toLocalCoord(point[0]));
        out[1] = yAxis.coordToData(yAxis.toLocalCoord(point[1]));
        return out;
    }

    getOtherAxis(axis: Axis2D): Axis2D {
        return this.getAxis(axis.dim === 'x' ? 'y' : 'x');
    }

    /**
     * Get rect area of cartesian.
     * Area will have a contain function to determine if a point is in the coordinate system.
     */
    getArea(): Cartesian2DArea {
        const xExtent = this.getAxis('x').getGlobalExtent();
        const yExtent = this.getAxis('y').getGlobalExtent();
        const x = Math.min(xExtent[0], xExtent[1]);
        const y = Math.min(yExtent[0], yExtent[1]);
        const width = Math.max(xExtent[0], xExtent[1]) - x;
        const height = Math.max(yExtent[0], yExtent[1]) - y;

        return new BoundingRect(x, y, width, height);
    }

};

interface Cartesian2DArea extends BoundingRect {}

export default Cartesian2D;
