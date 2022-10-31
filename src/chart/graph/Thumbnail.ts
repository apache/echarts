import * as graphic from '../../util/graphic';
import ExtensionAPI from '../../core/ExtensionAPI';
import * as layout from '../../util/layout';
import { BoxLayoutOptionMixin } from '../../util/types';
import SymbolClz from '../helper/Symbol';
import ECLinePath from '../helper/LinePath';
import GraphSeriesModel from './GraphSeries';
import * as zrUtil from 'zrender/src/core/util';
import View from '../../coord/View';
import SymbolDraw from '../helper/SymbolDraw';
import LineDraw from '../helper/LineDraw';

interface LayoutParams {
    pos: BoxLayoutOptionMixin
    box: {
        width: number,
        height: number
    }
}

function getViewRect(layoutParams: LayoutParams, wrapperShpae: {width: number, height: number}, aspect: number) {
    const option = zrUtil.extend(layoutParams, {
        aspect: aspect
    });
    return layout.getLayoutRect(option, {
        width: wrapperShpae.width,
        height: wrapperShpae.height
    });
}

class Thumbnail {

    group = new graphic.Group();

    private _selectedRect: graphic.Rect;

    private _layoutParams: LayoutParams;

    private _graphModel: GraphSeriesModel;

    private _wrapper: graphic.Rect;

    private _coords: View;

    constructor(containerGroup: graphic.Group) {
        containerGroup.add(this.group);
    }

    render(
        seriesModel: GraphSeriesModel,
        api: ExtensionAPI,
        symbolDraw: SymbolDraw,
        lineDraw: LineDraw,
         graph: graphic.Group
    ) {
        const model = seriesModel.getModel('thumbnail');
        const group = this.group;
        group.removeAll();
        if (!model.get('show')) {
            return;
        }
        this._graphModel = seriesModel;

        const symbolNodes = symbolDraw.group.children();
        const lineNodes = lineDraw.group.children();

        const lineGroup = new graphic.Group();
        const symbolGroup = new graphic.Group();

        const zoom = seriesModel.get('zoom', true);

        const itemStyleModel = model.getModel('itemStyle');
        const itemStyle = itemStyleModel.getItemStyle();
        const selectStyleModel = model.getModel('selectedAreaStyle');
        const selectStyle = selectStyleModel.getItemStyle();
        const thumbnailHeight = this._handleThumbnailShape(model.get('height', true), api, 'height');
        const thumbnailWidth = this._handleThumbnailShape(model.get('width', true), api, 'width');

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
            const subShape = zrUtil.clone((sub as graphic.Path).shape);
            const shape = zrUtil.extend(subShape, {
                width: sub.scaleX,
                height: sub.scaleY,
                x: x - sub.scaleX / 2,
                y: y - sub.scaleY / 2
            });
            const style = zrUtil.clone((sub as graphic.Path).style);
            const subThumbnail = new (sub as any).constructor({
                shape,
                style,
                z2: 151
            });
            symbolGroup.add(subThumbnail);
        }

        for (const node of lineNodes) {
            const line = (node as graphic.Group).children()[0];
            const style = zrUtil.clone((line as ECLinePath).style);
            const shape = zrUtil.clone((line as ECLinePath).shape);
            const lineThumbnail = new ECLinePath({
                style,
                shape,
                z2: 151
            });
            lineGroup.add(lineThumbnail);
        }

        thumbnailGroup.add(symbolGroup);
        thumbnailGroup.add(lineGroup);

        const thumbnailWrapper = new graphic.Rect({
            style: itemStyle,
            shape: {
                height: thumbnailHeight,
                width: thumbnailWidth
            },
            z2: 150
        });

        this._wrapper = thumbnailWrapper;

        group.add(thumbnailGroup);
        group.add(thumbnailWrapper);

        layout.positionElement(thumbnailWrapper, layoutParams.pos, layoutParams.box);

        const coordSys = new View();
        const boundingRect = graph.getBoundingRect();
        coordSys.setBoundingRect(boundingRect.x, boundingRect.y, boundingRect.width, boundingRect.height);

        this._coords = coordSys;

        const viewRect = getViewRect(layoutParams, thumbnailWrapper.shape, boundingRect.width / boundingRect.height);

        const scaleX = viewRect.width / boundingRect.width;
        const scaleY = viewRect.height / boundingRect.height;
        const offsetX = (thumbnailWidth - boundingRect.width * scaleX) / 2;
        const offsetY = (thumbnailHeight - boundingRect.height * scaleY) / 2;


        coordSys.setViewRect(
            thumbnailWrapper.x + offsetX,
            thumbnailWrapper.y + offsetY,
            viewRect.width,
            viewRect.height
        );

        const groupNewProp = {
            x: coordSys.x,
            y: coordSys.y,
            scaleX,
            scaleY
        };

        thumbnailGroup.attr(groupNewProp);

        this._selectedRect = new graphic.Rect({
            style: selectStyle,
            x: coordSys.x,
            y: coordSys.y,
            // ignore: true,
            z2: 152
        });

        group.add(this._selectedRect);

        if (zoom > 1) {
            this._updateSelectedRect('init');
        }
    }

    _updateSelectedRect(type: 'zoom' | 'pan' | 'init') {
        const getNewRect = (min = false) => {
            const {height, width} = this._layoutParams.box;
            const origin = [0, 0];
            const end = [width, height];
            const originData = this._graphModel.coordinateSystem.pointToData(origin);
            const endData = this._graphModel.coordinateSystem.pointToData(end);

            const thumbnailMain = this._coords.dataToPoint(originData as number[]);
            const thumbnailMax = this._coords.dataToPoint(endData as number[]);

            const newWidth = thumbnailMax[0] - thumbnailMain[0];
            const newHeight = thumbnailMax[1] - thumbnailMain[1];

            rect.x = thumbnailMain[0];
            rect.y = thumbnailMain[1];

            rect.shape.width = newWidth;
            rect.shape.height = newHeight;

            if (min === false) {
                rect.dirty();
            }
        };
        const rect = this._selectedRect;

        const {x: rMinX, y: rMinY, shape: {width: rWidth, height: rHeight}} = rect;
        const {x: wMinX, y: wMinY, shape: {width: wWidth, height: wHeight}} = this._wrapper;

        const [rMaxX, rMaxY] = [rMinX + rWidth, rMinY + rHeight];
        const [wMaxX, wMaxY] = [wMinX + wWidth, wMinY + wHeight];

        if (type === 'init') {
            rect.show();
            getNewRect();
            return;
        }
        else if (type === 'zoom' && rWidth < wWidth / 10) {
            getNewRect(true);
            return;
        }
        if (rMinX > wMinX && rMinY > wMinY && rMaxX < wMaxX && rMaxY < wMaxY) {
            this._selectedRect.show();
            // this._selectedRect.removeClipPath();
        }
        else {
            // this._selectedRect.removeClipPath();
            // this._selectedRect.setClipPath(this._wrapper);
            this._selectedRect.hide();
        }

        getNewRect();
    }

    _handleThumbnailShape(size: number | string, api: ExtensionAPI, type: 'height' | 'width') {
        if (typeof size === 'number') {
            return size;
        }
        else {
            const len = size.length;
            if (size.includes('%') && size.indexOf('%') === len - 1) {
                const screenSize = type === 'height' ? api.getHeight() : api.getWidth();
                return +size.slice(0, len - 1) * screenSize / 100;
            }
            return 200;
        }
    }

    remove() {
        this.group.removeAll();
    }
}

export default Thumbnail;