import * as graphic from '../../util/graphic';
import ExtensionAPI from '../../core/ExtensionAPI';
import * as layout from '../../util/layout';
import { BoxLayoutOptionMixin } from '../../util/types';
import SymbolClz from '../helper/Symbol';
import ECLinePath from '../helper/LinePath';
import GraphSeriesModel from './GraphSeries';
import * as zrUtil from 'zrender/src/core/util';
import View from '../../coord/View';

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

    _parent: graphic.Group;

    _selectedRect: graphic.Rect;

    _layoutParams: LayoutParams;

    _graphModel: GraphSeriesModel;

    _wrapper: graphic.Rect;

    _coords: View;
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
        const thumbnailHeight = model.get('height') as number;
        const thumbnailWidth = model.get('width') as number;
        const selectedDataBackground = model.get('selectedDataBackgroundStyle');
        const backgroundColor = itemStyle.get('backgroundColor');
        const borderColor = itemStyle.get('borderColor');

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
                width: sub.scaleX,
                height: sub.scaleY,
                x: x - sub.scaleX / 2,
                y: y - sub.scaleY / 2
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
                z2: 151
            });
            lineGroup.add(lineThumbnail);
        }

        thumbnailGroup.add(symbolGroup);
        thumbnailGroup.add(lineGroup);

        const thumbnailWrapper = new graphic.Rect({
            style: {
                stroke: borderColor,
                fill: backgroundColor
            },
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
        const boundingRect = this._parent.children()[0].getBoundingRect();
        coordSys.setBoundingRect(boundingRect.x, boundingRect.y, boundingRect.width, boundingRect.height);

        this._coords = coordSys;

        const viewRect = getViewRect(layoutParams, thumbnailWrapper.shape, boundingRect.width / boundingRect.height);

        const scaleX = viewRect.width / boundingRect.width;
        const scaleY = viewRect.height / boundingRect.height;
        const offectX = (thumbnailWidth - boundingRect.width * scaleX) / 2;
        const offectY = (thumbnailHeight - boundingRect.height * scaleY) / 2;


        coordSys.setViewRect(
            thumbnailWrapper.x + offectX,
            thumbnailWrapper.y + offectY,
            viewRect.width,
            viewRect.height
        );

        const groupNewProp = {
            x: coordSys.x,
            y: coordSys.y,
            scaleX,
            scaleY
        };

        const selectStyle = zrUtil.extend({lineWidth: 1, stroke: 'black'}, selectedDataBackground);

        thumbnailGroup.attr(groupNewProp);

        this._selectedRect = new graphic.Rect({
            style: selectStyle,
            x: coordSys.x,
            y: coordSys.y,
            ignore: true,
            z2: 152
        });

        group.add(this._selectedRect);

        if (zoom > 1) {
            this._updateSelectedRect('init');
        }
    }

    remove() {
        this.group.removeAll();
    }



    _updateSelectedRect(type: 'zoom' | 'pan' | 'init') {
        const getNewRect = (min = false) => {
            const {height, width} = this._layoutParams.box;
            const origin = [0, 40];
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
        if (rMinX > wMinX + 5 && rMinY > wMinY + 5 && rMaxX < wMaxX && rMaxY < wMaxY) {
            this._selectedRect.show();
        }
        else {
            this._selectedRect.hide();
        }

        getNewRect();
    }
}

export default Thumbnail;