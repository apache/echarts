import SeriesModel from '../../model/Series';
import {Dictionary, DecalObject} from '../../util/types';
import { getDecalFromPalette } from '../../model/mixin/palette';

export default function enableAriaDecalForTree(seriesModel: SeriesModel) {
    const data = seriesModel.getData();
    const tree = data.tree;
    const decalPaletteScope: Dictionary<DecalObject> = {};

    tree.eachNode(node => {
        // Use decal of level 1 node
        let current = node;
        while (current && current.depth > 1) {
            current = current.parentNode;
        }

        const decal = getDecalFromPalette(
            seriesModel.ecModel,
            current.name || current.dataIndex + '',
            decalPaletteScope
        );
        node.setVisual('decal', decal);
    });
}
