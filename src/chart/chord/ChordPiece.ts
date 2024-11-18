import * as graphic from '../../util/graphic';
import SeriesData from '../../data/SeriesData';
import ChordSeriesModel, { ChordNodeItemOption } from './ChordSeries';
import { extend } from 'zrender/src/core/util';
import { getSectorCornerRadius } from '../helper/sectorHelper';

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
        // console.log(layout)

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
