import * as graphic from '../../util/graphic';
import ExtensionAPI from '../../core/ExtensionAPI';
import * as layout from '../../util/layout';
import { BoxLayoutOptionMixin } from '../../util/types';
import SymbolClz from '../helper/Symbol';
import ECLinePath from '../helper/LinePath';
import GraphSeriesModel from './GraphSeries';
import { RoamEventParams } from '../../component/helper/RoamController';
import { clone } from 'zrender/src/core/util';
import { zrUtil } from '../../echarts.all';

interface LayoutParams {
    pos: BoxLayoutOptionMixin
    box: {
        width: number,
        height: number
    }
}

class Thumbnail {

    group = new graphic.Group();
    _parent: graphic.Group;

    _widthProportion: number;
    _heightProportion: number;

    _selectedRect: graphic.Rect;
    _wrapper: graphic.Rect;
    _layoutParams: LayoutParams;

    _graphModel: GraphSeriesModel;

    constructor(containerGroup: graphic.Group) {
        containerGroup.add(this.group);
        this._parent = containerGroup;
    }

    render(seriesModel: GraphSeriesModel, api: ExtensionAPI) {
        const model = seriesModel.getModel('thumbnail');
        const group = this.group;

        group.removeAll();
        if (!model.get('show')) {
            return;
        }

        this._graphModel = seriesModel;

        const childrenNodes = (this._parent.children()[0] as graphic.Group).children();
        const symbolNodes = (childrenNodes[0] as graphic.Group).children();
        const lineNodes = (childrenNodes[1] as graphic.Group).children();

        const backgroundColor = model.getModel('backgroundColor');
        const borderColor = model.getModel('borderColor');
        const thumbnailScale = model.getModel('scale').option;
        const selectedDataBackground = model.getModel('selectedDataBackground').option;

        this._layoutParams = {
            pos: {
                left: model.get('left'),
                right: model.get('right'),
                top: model.get('top'),
                bottom: model.get('bottom')
            },
            box: {
                width: api.getWidth(),
                height: api.getHeight()
            }
        };

        const layoutParams = this._layoutParams;

        const thumbnailGroup = new graphic.Group();

        for (const node of symbolNodes) {
            const sub = (node as graphic.Group).children()[0];
            const x = (node as SymbolClz).x;
            const y = (node as SymbolClz).y;
            const subShape = zrUtil.extend({}, (sub as graphic.Path).shape);
            const shape = zrUtil.extend(subShape, { width: 5,
                height: 5,
                x: (x * thumbnailScale - 2.5),
                y: (y * thumbnailScale - 2.5)});

            const subThumbnail = new (sub as any).constructor({
                shape,
                style: (sub as graphic.Path).style,
                z2: 151
                });

            thumbnailGroup.add(subThumbnail);
        }

        for (const node of lineNodes) {
            const line = (node as graphic.Group).children()[0];
            const lineThumbnail = new ECLinePath({
                style: (line as ECLinePath).style,
                shape: (line as ECLinePath).shape,
                scaleX: thumbnailScale,
                scaleY: thumbnailScale,
                z2: 151
            });
            thumbnailGroup.add(lineThumbnail);
        }

        const thumbnailWrapper = new graphic.Rect({
            style: {
                stroke: borderColor.option,
                fill: backgroundColor.option,
                lineWidth: 2
            },
            shape: {
                height: layoutParams.box.height * thumbnailScale,
                width: layoutParams.box.width * thumbnailScale
            },
            z2: 150
        });

        this._wrapper = thumbnailWrapper;

        const selectStyle = zrUtil.extend({lineWidth: 10, stroke: 'black'}, selectedDataBackground);

        this._selectedRect = new graphic.Rect({
            style: selectStyle,
            shape: clone(thumbnailWrapper.shape),
            ignore: true,
            z2: 150
        });

        group.add(thumbnailWrapper);
        group.add(this._selectedRect);
        group.add(thumbnailGroup);

        layout.positionElement(group, layoutParams.pos, layoutParams.box);
    }

    remove() {
        this.group.removeAll();
    }

    _updateZoom(e: RoamEventParams['zoom'], scale: number) {
        const wrapper = this._wrapper.getBoundingRect();
        const {height, width} = this._layoutParams.box;
        const rect = this._selectedRect;
        const origin = [0, 0];
        const end = [width, height];
        const originData = this._graphModel.coordinateSystem.pointToData(origin);
        const endData = this._graphModel.coordinateSystem.pointToData(end);
        const x0 = (originData as number[])[0] / width;
        const x1 = (endData as number[])[0] / width;

        const y0 = (originData as number[])[1] / height;
        const y1 = (endData as number[])[1] / height;

        const offectX = x0 * rect.shape.width;
        const offectY = y0 * rect.shape.height;

        if (scale === 0 || !wrapper.contain(offectX, offectY)) {
            this._selectedRect.hide();
            return;
        }

        if (scale >= 30) {
            return;
        }

        this._selectedRect.show();

        rect.x = offectX;
        rect.y = offectY;

        rect.scaleX = x1 - x0;
        rect.scaleY = y1 - y0;
    }

    _updatePan(e: RoamEventParams['pan']) {
        const {height, width} = this._layoutParams.box;
        const rect = this._selectedRect;

        const origin = [0, 0];
        const originData = this._graphModel.coordinateSystem.pointToData(origin);

        const x = (originData as number[])[0] / width;
        const y = (originData as number[])[1] / height;

        if (x <= 0 || y <= 0) {
            return;
        };

        rect.x = x * rect.shape.width;
        rect.y = y * rect.shape.height;
    }
}

export default Thumbnail;
