import * as graphic from '../../util/graphic';
import ExtensionAPI from '../../core/ExtensionAPI';
import * as layout from '../../util/layout';
import GraphSeriesModel from './GraphSeries';
import * as zrUtil from 'zrender/src/core/util';
import View from '../../coord/View';
import BoundingRect from 'zrender/src/core/BoundingRect';
import * as matrix from 'zrender/src/core/matrix';
import * as vector from 'zrender/src/core/vector';
import SeriesModel from '../../model/Series';
import { BoxLayoutOptionMixin, ItemStyleOption } from '../../util/types';
import RoamController, { RoamEventDefinition, RoamType } from '../../component/helper/RoamController';
import Eventful from 'zrender/src/core/Eventful';
import tokens from '../../visual/tokens';


// TODO:
// Thumbnail should not be bound to a single series when used on
// coordinate system like cartesian and geo/map?
// Should we make thumbnail as a component like markers/axisPointer/brush did?


interface BorderRadiusOption {
    borderRadius?: number | number[]
}

// TODO: apply to other series
export interface ThumbnailOption extends BoxLayoutOptionMixin {
    show?: boolean,
    itemStyle?: ItemStyleOption & BorderRadiusOption
    windowStyle?: ItemStyleOption & BorderRadiusOption
}

interface WindowRect extends graphic.Rect {
    __r?: BorderRadiusOption['borderRadius'];
}

export interface ThumbnailZ2Setting {
    background: number;
    window: number;
}

class Thumbnail extends Eventful<Pick<RoamEventDefinition, 'zoom' | 'pan'>> {

    group = new graphic.Group();

    private _api: ExtensionAPI;
    private _seriesModel: GraphSeriesModel;

    private _windowRect: WindowRect;
    private _contentBoundingRect: BoundingRect;
    private _thumbnailCoordSys: View;

    private _mtSeriesToThumbnail: matrix.MatrixArray;
    private _mtThumbnailToSerise: matrix.MatrixArray;

    private _thumbnailController: RoamController;
    private _isEnabled: boolean;

    render(opt: {
        seriesModel: GraphSeriesModel;
        api: ExtensionAPI;
        roamType: RoamType;
        z2Setting: ThumbnailZ2Setting;
        seriesBoundingRect: BoundingRect,
        renderThumbnailContent: (viewGroup: graphic.Group) => void
    }) {
        const seriesModel = this._seriesModel = opt.seriesModel;
        const api = this._api = opt.api;

        const thumbnailModel = seriesModel.getModel('thumbnail');
        const group = this.group;

        this._isEnabled = thumbnailModel.get('show', true) && isSeriesSupported(seriesModel);
        if (!this._isEnabled) {
            this._clear();
            return;
        }

        group.removeAll();

        const z2Setting = opt.z2Setting;
        const cursor = opt.roamType ? 'pointer' : 'default';
        const itemStyleModel = thumbnailModel.getModel('itemStyle');
        const itemStyle = itemStyleModel.getItemStyle();
        itemStyle.fill = seriesModel.ecModel.get('backgroundColor') || tokens.color.neutral00;

        // Try to use border-box in thumbnail, see https://github.com/apache/echarts/issues/18022
        const boxBorderWidth = itemStyle.lineWidth || 0;
        const boxContainBorder = layout.getLayoutRect(
            {
                left: thumbnailModel.get('left', true),
                top: thumbnailModel.get('top', true),
                right: thumbnailModel.get('right', true),
                bottom: thumbnailModel.get('bottom', true),
                width: thumbnailModel.get('width', true),
                height: thumbnailModel.get('height', true)
            },
            {
                width: api.getWidth(),
                height: api.getHeight()
            }
        );
        const borderBoundingRect =
            layout.applyPedding(boxContainBorder.clone(), boxBorderWidth / 2);
        const contentBoundingRect = this._contentBoundingRect =
            layout.applyPedding(boxContainBorder.clone(), boxBorderWidth);

        const clipGroup = new graphic.Group();
        group.add(clipGroup);
        clipGroup.setClipPath(new graphic.Rect({
            shape: contentBoundingRect.plain()
        }));

        const seriesViewGroup = new graphic.Group();
        clipGroup.add(seriesViewGroup);
        opt.renderThumbnailContent(seriesViewGroup);

        // Draw border and background and shadow of thumbnail box.
        group.add(new graphic.Rect({
            style: itemStyle,
            shape: zrUtil.extend(borderBoundingRect.plain(), {
                r: itemStyleModel.get('borderRadius', true)
            }),
            cursor,
            z2: z2Setting.background
        }));

        const coordSys = this._thumbnailCoordSys = new View();
        const seriesBoundingRect = opt.seriesBoundingRect;
        coordSys.setBoundingRect(
            seriesBoundingRect.x, seriesBoundingRect.y, seriesBoundingRect.width, seriesBoundingRect.height
        );

        // Find an approperiate rect in contentBoundingRect for the entire graph.
        const graphViewRect = layout.getLayoutRect(
            {
                left: 'center',
                top: 'center',
                aspect: seriesBoundingRect.width / seriesBoundingRect.height
            },
            contentBoundingRect
        );
        coordSys.setViewRect(graphViewRect.x, graphViewRect.y, graphViewRect.width, graphViewRect.height);
        seriesViewGroup.attr(coordSys.getTransformInfo().raw);

        const windowStyleModel = thumbnailModel.getModel('windowStyle');
        const windowRect: WindowRect = this._windowRect = new graphic.Rect({
            style: windowStyleModel.getItemStyle(),
            cursor,
            z2: z2Setting.window
        });
        windowRect.__r = windowStyleModel.get('borderRadius', true);
        clipGroup.add(windowRect);

        this._resetRoamController(opt.roamType);

        this.updateWindow();
    }

    /**
     * Update window by series view roam status.
     */
    updateWindow(): void {
        if (!this._isEnabled) {
            return;
        }

        this._updateTransform();

        const rect = new BoundingRect(0, 0, this._api.getWidth(), this._api.getHeight());
        rect.applyTransform(this._mtSeriesToThumbnail);
        const windowRect = this._windowRect;
        windowRect.setShape(zrUtil.defaults({r: windowRect.__r}, rect));
    }

    /**
     * Create transform that convert pixel vector from
     * series coordinate system to thumbnail coordinate system.
     *
     * TODO: consider other type of series.
     */
    private _updateTransform(): void {
        const seriesCoordSys = this._seriesModel.coordinateSystem as View;
        this._mtSeriesToThumbnail = matrix.mul([], this._thumbnailCoordSys.transform, seriesCoordSys.invTransform);
        this._mtThumbnailToSerise = matrix.invert([], this._mtSeriesToThumbnail);
    }

    private _resetRoamController(roamType: RoamType): void {
        let thumbnailController = this._thumbnailController;
        if (!thumbnailController) {
            thumbnailController = this._thumbnailController = new RoamController(this._api.getZr());
            thumbnailController.setPointerChecker((e, x, y) => this.contain(x, y));
        }

        thumbnailController.enable(roamType);
        thumbnailController
            .off('pan')
            .off('zoom')
            .on('pan', (event) => {
                const transform = this._mtThumbnailToSerise;
                const oldOffset = vector.applyTransform([], [event.oldX, event.oldY], transform);
                // reverse old and new because we pan window rather graph in thumbnail.
                const newOffset = vector.applyTransform([], [event.oldX - event.dx, event.oldY - event.dy], transform);
                this.trigger('pan', {
                    dx: newOffset[0] - oldOffset[0],
                    dy: newOffset[1] - oldOffset[1],
                    oldX: oldOffset[0],
                    oldY: oldOffset[1],
                    newX: newOffset[0],
                    newY: newOffset[1],
                    isAvailableBehavior: event.isAvailableBehavior
                });
            })
            .on('zoom', (event) => {
                const offset = vector.applyTransform([], [event.originX, event.originY], this._mtThumbnailToSerise);
                this.trigger('zoom', {
                    scale: 1 / event.scale,
                    originX: offset[0],
                    originY: offset[1],
                    isAvailableBehavior: event.isAvailableBehavior
                });
            });
    }

    contain(x: number, y: number): boolean {
        return this._contentBoundingRect && this._contentBoundingRect.contain(x, y);
    }

    private _clear(): void {
        this.group.removeAll();
        this._thumbnailController && this._thumbnailController.disable();
    }

    remove() {
        this._clear();
    }

    dispose() {
        this._clear();
    }

    static defaultOption: ThumbnailOption = {
        show: false,

        right: 0,
        bottom: 0,

        height: '25%',
        width: '25%',

        itemStyle: {
            // Use echarts option.backgorundColor by default.
            borderColor: tokens.color.border,
            borderWidth: 1
        },

        windowStyle: {
            borderWidth: 1,
            color: tokens.color.neutral30,
            borderColor: tokens.color.neutral40,
            opacity: 0.3
        }
    };
}

// TODO: other coordinate system.
function isSeriesSupported(seriesModel: SeriesModel): boolean {
    const seriesCoordSys = seriesModel.coordinateSystem;
    return seriesCoordSys && seriesCoordSys.type === 'view';
}

export default Thumbnail;