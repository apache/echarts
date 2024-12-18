import { extend } from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import SeriesData from '../../data/SeriesData';
import { getSectorCornerRadius } from '../helper/sectorHelper';
import ChordSeriesModel, { ChordNodeItemOption } from './ChordSeries';

export default class ChordPiece extends graphic.Sector {

    constructor(data: SeriesData, idx: number, startAngle: number) {
        super();

        this.z2 = 2;

        const text = new graphic.Text();

        this.setTextContent(text);

        this.updateData(data, idx, startAngle, true);
    }

    updateData(data: SeriesData, idx: number, startAngle?: number, firstCreate?: boolean): void {
        const sector = this;
        const node = data.graph.getNodeByIndex(idx);

        const seriesModel = data.hostModel as ChordSeriesModel;
        const itemModel = node.getModel<ChordNodeItemOption>();

        // layout position is the center of the sector
        const layout = data.getItemLayout(idx) as graphic.Sector['shape'];
        const shape: graphic.Sector['shape'] = extend(
            getSectorCornerRadius(itemModel.getModel('itemStyle'), layout, true),
            layout
        );

        const el = this;

        // Ignore NaN data.
        if (isNaN(shape.startAngle)) {
            // Use NaN shape to avoid drawing shape.
            el.setShape(shape);
            return;
        }

        if (firstCreate) {
            el.setShape(shape);

            if (startAngle != null) {
                el.setShape({
                    startAngle,
                    endAngle: startAngle
                });
                graphic.initProps(el, {
                    shape: {
                        startAngle: shape.startAngle,
                        endAngle: shape.endAngle
                    }
                }, seriesModel, idx);
            }
            else {
                graphic.updateProps(el, {
                    shape: shape
                }, seriesModel, idx);
            }
        }

        const sectorShape = extend(
            getSectorCornerRadius(
                itemModel.getModel('itemStyle'),
                layout,
                true
            ),
            layout
        );
        sector.setShape(sectorShape);
        sector.useStyle(data.getItemVisual(idx, 'style'));
    }

}
