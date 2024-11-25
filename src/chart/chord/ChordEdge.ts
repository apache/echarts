import { PathProps } from 'zrender/src/graphic/Path';
import PathProxy from 'zrender/src/core/PathProxy';
import * as graphic from '../../util/graphic';

export class ChordPathShape {
    // Souce node, two points forming an arc
    s1: [number, number] = [0, 0];
    s2: [number, number] = [0, 0];
    sStartAngle: number = 0;
    sEndAngle: number = 0;

    // Target node, two points forming an arc
    t1: [number, number] = [0, 0];
    t2: [number, number] = [0, 0];
    tStartAngle: number = 0;
    tEndAngle: number = 0;

    cx: number = 0;
    cy: number = 0;
    // series.r0 of ChordSeries
    r: number = 0;
}

interface ChordEdgePathProps extends PathProps {
    shape?: Partial<ChordPathShape>
}

export class ChordEdge extends graphic.Path<ChordEdgePathProps> {
    shape: ChordPathShape;

    constructor(opts?: ChordEdgePathProps) {
        super(opts);
    }

    buildPath(ctx: PathProxy | CanvasRenderingContext2D, shape: ChordPathShape): void {
        // Start from n11
        ctx.moveTo(shape.s1[0], shape.s1[1]);

        const ratio = 0.7;

        // Draw the arc from n11 to n12
        ctx.arc(shape.cx, shape.cy, shape.r, shape.sStartAngle, shape.sEndAngle, false);

        // // Bezier curve to cp1 and then to n21
        ctx.bezierCurveTo(
            (shape.cx - shape.s2[0]) * ratio + shape.s2[0],
            (shape.cy - shape.s2[1]) * ratio + shape.s2[1],
            (shape.cx - shape.t1[0]) * ratio + shape.t1[0],
            (shape.cy - shape.t1[1]) * ratio + shape.t1[1],
            shape.t1[0],
            shape.t1[1]
        );

        // Draw the arc from n21 to n22
        ctx.arc(shape.cx, shape.cy, shape.r, shape.tStartAngle, shape.tEndAngle, false);

        // Bezier curve back to cp2 and then to n11
        ctx.bezierCurveTo(
            (shape.cx - shape.t2[0]) * ratio + shape.t2[0],
            (shape.cy - shape.t2[1]) * ratio + shape.t2[1],
            (shape.cx - shape.s1[0]) * ratio + shape.s1[0],
            (shape.cy - shape.s1[1]) * ratio + shape.s1[1],
            shape.s1[0],
            shape.s1[1]
        );

        ctx.closePath();
    }
}
