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

        const zoom = seriesModel.get('zoom');

        const itemStyle = model.getModel('itemStyle');
        this._height = model.getModel('height').option;
        this._width = model.getModel('width').option;
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
                x: (x * 0.25 - 2.5),
                y: (y * 0.25 - 2.5)
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
                scaleX: 0.25,
                scaleY: 0.25,
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

        this._wrapper = thumbnailWrapper;

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
                height: layoutParams.box.height * 0.25,
                width: layoutParams.box.width * 0.25
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

        layout.positionElement(group, layoutParams.pos, layoutParams.box);

        if (zoom >= 2) {
            this._updateSelectedRect('init');
        }
    }

    remove() {
        this.group.removeAll();
    }



    _updateSelectedRect(type: 'zoom' | 'pan' | 'init') {
        const getNewRect = () => {
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

            const newWidth = (x1 - x0) * this._thumbnailSystem.shape.width;
            const newHeight = (y1 - y0) * this._thumbnailSystem.shape.height;

            // 限制slectRect最小范围 达到最小范围后如果是zoom则限制rect改
            if (newWidth <= wWidth / 10) {
                if (type === 'zoom') {
                    return;
                }
                rect.x = offectX + this._thumbnailSystem.x;
                rect.y = offectY + this._thumbnailSystem.y;
                return;
            }

            rect.x = offectX + this._thumbnailSystem.x;
            rect.y = offectY + this._thumbnailSystem.y;

            rect.shape.width = newWidth;
            rect.shape.height = newHeight;

            rect.dirty();
        };
        const rect = this._selectedRect;

        const {x: rMinX, y: rMinY, shape: {width: rWidth, height: rHeight}} = rect;
        const {x: wMinX, y: wMinY, shape: {width: wWidth, height: wHeight}} = this._wrapper;

        const rMaxX = rMinX + rWidth;
        const rMaxY = rMinY + rHeight;
        const wMaxX = wMinX + wWidth;
        const wMaxY = wMinY + wHeight;

        if (type === 'init') {
            rect.show();
            getNewRect();
            return;
        }

        if (rMinX > wMinX && rMinY > wMinY && rMaxX < wMaxX && rMaxY < wMaxY) {
            this._selectedRect.show();
        }
        else {
            this._selectedRect.hide();
        }

        getNewRect();
    }
}

export default Thumbnail;