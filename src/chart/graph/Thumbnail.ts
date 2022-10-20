import * as graphic from '../../util/graphic';
import ExtensionAPI from '../../core/ExtensionAPI';
import * as layout from '../../util/layout';
import { BoxLayoutOptionMixin } from '../../util/types';
import SymbolClz from '../helper/Symbol';
import ECLinePath from '../helper/LinePath';
import GraphSeriesModel from './GraphSeries';
import * as zrUtil from 'zrender/src/core/util';

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

    _selectedRect: graphic.Rect;

    _layoutParams: LayoutParams;

    _graphModel: GraphSeriesModel;

    _thumbnailSystem: graphic.Rect;

    _wrapper: graphic.Rect;

    _height: number;
    _width: number;

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

        const lineGroup = new graphic.Group();
        const symbolGroup = new graphic.Group();

        const itemStyle = model.getModel('itemStyle');
        this._height = model.getModel('height').option;
        this._width = model.getModel('width').option;
        const scale = model.getModel('scale').option;
        const selectedDataBackground = model.getModel('selectedDataBackgroundStyle').option;
        const backgroundColor = itemStyle.getModel('backgroundColor');
        const borderColor = itemStyle.getModel('borderColor');

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
            const shape = zrUtil.extend(subShape, {
                width: 5,
                height: 5,
                x: (x * scale - 2.5),
                y: (y * scale - 2.5)
            });

            const subThumbnail = new (sub as any).constructor({
                shape,
                style: (sub as graphic.Path).style,
                z2: 151
            });
            symbolGroup.add(subThumbnail);
        }

        for (const node of lineNodes) {
            const line = (node as graphic.Group).children()[0];
            const lineThumbnail = new ECLinePath({
                style: (line as ECLinePath).style,
                shape: (line as ECLinePath).shape,
                scaleX: scale,
                scaleY: scale,
                z2: 151
            });
            lineGroup.add(lineThumbnail);
        }

        thumbnailGroup.add(lineGroup);
        thumbnailGroup.add(symbolGroup);

        const { x, y, width, height } = thumbnailGroup.getBoundingRect();

        const thumbnailWrapper = new graphic.Rect({
            style: {
                stroke: borderColor.option,
                fill: backgroundColor.option
            },
            shape: {
                height: this._height,
                width: this._width
            },
            x,
            y,
            z2: 150
        });

        const offectX = this._width / 2 - width / 2;
        const offectY = this._height / 2 - height / 2;

        thumbnailGroup.x += offectX;
        thumbnailGroup.y += offectY;

        const view = new graphic.Rect({
            style: {
                stroke: borderColor.option,
                fill: backgroundColor.option,
                lineWidth: 1
            },
            shape: {
                height: layoutParams.box.height * scale,
                width: layoutParams.box.width * scale
            },
            x: thumbnailGroup.x,
            y: thumbnailGroup.y,
            z2: 150
        });

        this._thumbnailSystem = view;

        const selectStyle = zrUtil.extend({lineWidth: 1, stroke: 'black'}, selectedDataBackground);

        this._selectedRect = new graphic.Rect({
            style: selectStyle,
            shape: zrUtil.clone(view.shape),
            ignore: true,
            x: thumbnailWrapper.x,
            y: thumbnailWrapper.y,
            z2: 152
        });

        group.add(this._selectedRect);
        group.add(thumbnailGroup);
        group.add(thumbnailWrapper);

        this._wrapper = thumbnailWrapper;

        layout.positionElement(group, layoutParams.pos, layoutParams.box);
    }

    remove() {
        this.group.removeAll();
    }

    _updateSelectedRect(type: 'pan' | 'zoom', scale: number) {
        if (type === 'pan') {
            const {height, width} = this._layoutParams.box;
            const rect = this._selectedRect;

            const origin = [0, 40];
            const originData = this._graphModel.coordinateSystem.pointToData(origin);

            const x = (originData as number[])[0] / width;
            const y = (originData as number[])[1] / height;

            if (x <= 0 || y <= 0) {
                return;
            };

            rect.x = x * this._thumbnailSystem.shape.width + this._thumbnailSystem.x;
            rect.y = y * this._thumbnailSystem.shape.height + this._thumbnailSystem.y;
        }
        else {
            if (scale === 0) {
                this._selectedRect.hide();
                return;
            }

            if (scale >= 30) {
                return;
            }
            const rect = this._selectedRect;

            if (rect.x > this._wrapper.x) {
                this._selectedRect.show();
            }
            else {
                this._selectedRect.hide();
            }

            const {height, width} = this._layoutParams.box;
            const origin = [0, 40];
            const end = [width, height];
            const originData = this._graphModel.coordinateSystem.pointToData(origin);
            const endData = this._graphModel.coordinateSystem.pointToData(end);
            const x0 = (originData as number[])[0] / width;
            const x1 = (endData as number[])[0] / width;

            const y0 = (originData as number[])[1] / height;
            const y1 = (endData as number[])[1] / height;

            const offectX = x0 * this._thumbnailSystem.shape.width;
            const offectY = y0 * this._thumbnailSystem.shape.height;

            rect.x = offectX + this._thumbnailSystem.x;
            rect.y = offectY + this._thumbnailSystem.y;

            rect.shape.width = (x1 - x0) * this._thumbnailSystem.shape.width;
            rect.shape.height = (y1 - y0) * this._thumbnailSystem.shape.height;

            rect.dirty();
        }
    }
}

export default Thumbnail;