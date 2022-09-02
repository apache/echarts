import * as graphic from '../../util/graphic';
import ExtensionAPI from '../../core/ExtensionAPI';
import * as layout from '../../util/layout';
import { BoxLayoutOptionMixin } from '../../util/types';
import MapSeries from './MapSeries';
import { RoamEventParams } from '../../component/helper/RoamController';
import { clone } from 'zrender/src/core/util';

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


  _treeModel: MapSeries;
  constructor(containerGroup: graphic.Group) {
      containerGroup.add(this.group);
      this._parent = containerGroup;
  }

  render(seriesModel: MapSeries, api: ExtensionAPI) {
      const model = seriesModel.getModel('thumbnail');
      const group = this.group;
      group.removeAll();
      if (!model.get('show')) {
        return;
      }
      if (this._parent.children()[0].id === group.id) {
          return;
      }

      this._treeModel = seriesModel;
      let compoundPaths;
      if (this._parent.children()[0] instanceof graphic.Group) {
          const pathGroup = this._parent.children()[0];
          if (pathGroup instanceof graphic.Group) {
              compoundPaths = (pathGroup.children()[0] as graphic.Group).children();
          }

      }
      else {
        return;
      }

      const backgroundColor = model.getModel('backgroundColor');
      const borderColor = model.getModel('borderColor');
      const thumbnailWidth = model.get('width');
      const thumbnailHeight = model.get('height');
      const selectedDataBackground = model.getModel('selectedDataBackground');

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

      this._widthProportion = <number>thumbnailWidth / layoutParams.box.width;
      this._heightProportion = <number>thumbnailHeight / layoutParams.box.height;

      const thumbnailGroup = new graphic.Group();
      for (const pathGroup of compoundPaths) {
          const compoundPath = (pathGroup as graphic.Group).children()[0];
          const compoundPathThumbnail = new graphic.CompoundPath({
              style: (compoundPath as graphic.CompoundPath).style,
              shape: (compoundPath as graphic.CompoundPath).shape,
              scaleX: 0.25,
              scaleY: 0.25,
              z: 2,
              z2: 151
          });

          thumbnailGroup.add(compoundPathThumbnail);
      }

      const thumbnailWrapper = new graphic.Rect({
        style: {
          stroke: borderColor.option,
          fill: backgroundColor.option,
          lineWidth: 2
        },
        shape: {
          height: thumbnailHeight === 0 ? layoutParams.box.height / 4 : thumbnailHeight,
          width: thumbnailWidth === 0 ? layoutParams.box.width / 4 : thumbnailWidth
        },
        z: 2,
        z2: 130
      });

      this._wrapper = thumbnailWrapper;

      // const content = thumbnailGroup.getBoundingRect();
      // const offectX = (<number>thumbnailWrapper.shape.width - content.width) / 2;
      // const offectY = (<number>thumbnailWrapper.shape.height - content.height) / 2;

      // thumbnailGroup.x = offectX;
      // thumbnailGroup.y = offectY;

      const areaStyle = selectedDataBackground.get('areaStyle');
      const lineStyle = selectedDataBackground.get('lineStyle');

      this._selectedRect = new graphic.Rect({
        style: {...areaStyle, ...lineStyle},
        shape: clone(thumbnailWrapper.shape),
        z: 2,
        z2: 150,
        draggable: true,
        ignore: true
        // ondrag: (e) => {
        //   const {x, y} = e.target;
        //   const Y = <number>thumbnailWrapper.shape.height * (1 - this._selectedRect.scaleY);
        //   const X = <number>thumbnailWrapper.shape.width * (1 - this._selectedRect.scaleX);
        //       if (x < 0 || x > X || y < 0 || y > Y) {
        //           if (x < 0) {
        //               e.target.x = 0;
        //           }
        //           if (y < 0) {
        //               e.target.y = 0;
        //           }
        //           if (x > X) {
        //               e.target.x = X;
        //           }
        //           if (y > Y) {
        //             e.target.y = Y;
        //           }
        //       }
        // }
      });

      group.add(thumbnailWrapper);
      group.add(thumbnailGroup);
      group.add(this._selectedRect);

      //     if (node instanceof graphic.BezierCurve) {
      //       const edgethumbnail = new graphic.BezierCurve({
      //         style: (node as graphic.BezierCurve).style,
      //         shape: (node as graphic.BezierCurve).shape,
      //         scaleX: 0.25,
      //         scaleY: 0.25,
      //         z: 3,
      //         z2: 150
      //       });
      //       thumbnailGroup.add(edgethumbnail);
      //     }
      //     else if (node instanceof SymbolClz) {
      //       const sub = (node as graphic.Group).children()[0];
      //       const x = (node as SymbolClz).x;
      //       const y = (node as SymbolClz).y;
      //       const subThumbnail = new (sub as any).constructor({
      //         shape: {
      //               ...(sub as graphic.Path).shape,
      //               width: 5,
      //               height: 5,
      //               x: (x * 0.25 - 2.5),
      //               y: (y * 0.25 - 2.5)
      //             },
      //         style: (sub as graphic.Path).style,
      //         z: 3,
      //         z2: 151
      //       });

      //       thumbnailGroup.add(subThumbnail);
      //     }

      // }

      // const thumbnailWrapper = new graphic.Rect({
      //   style: {
      //     stroke: borderColor.option,
      //     fill: backgroundColor.option,
      //     lineWidth: 2
      //   },
      //   shape: {
      //     height: thumbnailHeight === 0 ? layoutParams.box.height / 4 : thumbnailHeight,
      //     width: thumbnailWidth === 0 ? layoutParams.box.width / 4 : thumbnailWidth
      //   },
      //   z: 2,
      //   z2: 130
      // });

      // this._wrapper = thumbnailWrapper;

      // const content = thumbnailGroup.getBoundingRect();
      // const offectX = (<number>thumbnailWrapper.shape.width - content.width) / 2;
      // const offectY = (<number>thumbnailWrapper.shape.height - content.height) / 2;

      // thumbnailGroup.x = offectX;
      // thumbnailGroup.y = offectY;

      // const areaStyle = selectedDataBackground.get('areaStyle');
      // const lineStyle = selectedDataBackground.get('lineStyle');

      // this._selectedRect = new graphic.Rect({
      //   style: {...areaStyle, ...lineStyle},
      //   shape: clone(thumbnailWrapper.shape),
      //   z: 2,
      //   z2: 150,
      //   draggable: true,
      //   ignore: true
      //   // ondrag: (e) => {
      //   //   const {x, y} = e.target;
      //   //   const Y = <number>thumbnailWrapper.shape.height * (1 - this._selectedRect.scaleY);
      //   //   const X = <number>thumbnailWrapper.shape.width * (1 - this._selectedRect.scaleX);
      //   //       if (x < 0 || x > X || y < 0 || y > Y) {
      //   //           if (x < 0) {
      //   //               e.target.x = 0;
      //   //           }
      //   //           if (y < 0) {
      //   //               e.target.y = 0;
      //   //           }
      //   //           if (x > X) {
      //   //               e.target.x = X;
      //   //           }
      //   //           if (y > Y) {
      //   //             e.target.y = Y;
      //   //           }
      //   //       }
      //   // }
      // });

      // group.add(thumbnailWrapper);
      // group.add(thumbnailGroup);
      // group.add(this._selectedRect);

      // layout.positionElement(group, layoutParams.pos, layoutParams.box);
      layout.positionElement(group, layoutParams.pos, layoutParams.box);

  }

  remove() {
    this.group.removeAll();
  }

  _updateZoom(e: RoamEventParams['zoom']) {

    const wrapper = this._wrapper.getBoundingRect();
    const {height, width} = this._layoutParams.box;
    const rect = this._selectedRect;
    const origin = [0, 0];
    const end = [width, height];
    const originData = this._treeModel.coordinateSystem.pointToData(origin);
    const endData = this._treeModel.coordinateSystem.pointToData(end);
    const x0 = (originData as number[])[0] / width;
    const x1 = (endData as number[])[0] / width;

    const y0 = (originData as number[])[1] / height;
    const y1 = (endData as number[])[1] / height;

    const offectX = x0 * rect.shape.width;
    const offectY = y0 * rect.shape.height;

    if (x1 - x0 >= 1 || !wrapper.contain(offectX, offectY)) {
        this._selectedRect.hide();
        return;
    }

    if (x1 - x0 < 0.08) {
      return;
    };
    if (this._selectedRect.ignore) {
        this._selectedRect.show();
    }
    rect.x = offectX;
    rect.y = offectY;

    rect.scaleX = x1 - x0;
    rect.scaleY = y1 - y0;

}

  _updatePan(e: RoamEventParams['pan']) {
      const {height, width} = this._layoutParams.box;
      const rect = this._selectedRect;

      const origin = [0, 0];
      const originData = this._treeModel.coordinateSystem.pointToData(origin);

      const x0 = (originData[0] / width);
      const y0 = (originData[1] / height);

      rect.x = (x0 * rect.shape.width) - (rect.shape.width * rect.scaleX) / 2;
      rect.y = (y0 * rect.shape.height);
  }
}


export default Thumbnail;
