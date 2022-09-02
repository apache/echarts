import * as graphic from '../../util/graphic';
import ExtensionAPI from '../../core/ExtensionAPI';
import * as layout from '../../util/layout';
import { BoxLayoutOptionMixin } from '../../util/types';
import SymbolClz from '../helper/Symbol';
import ECLinePath from '../helper/LinePath';
import SankeySeriesModel from './SankeySeries';
import { RoamEventParams } from '../../component/helper/RoamController';
import { clone } from 'zrender/src/core/util';
import { SankeyPath } from './SankeyView';

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
  _contentRect: graphic.BoundingRect;


  _treeModel: SankeySeriesModel;
  constructor(containerGroup: graphic.Group) {
      containerGroup.add(this.group);
      this._parent = containerGroup;
  }

  render(seriesModel: SankeySeriesModel, api: ExtensionAPI) {
      const model = seriesModel.getModel('thumbnail');
      const group = this.group;

      group.removeAll();
      if (!model.get('show')) {
        return;
      }

      this._treeModel = seriesModel;

      const childrenNodes = this._parent.children();

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

      for (const node of childrenNodes) {
          if (node instanceof SankeyPath) {
              const sankeyThumbnail = new SankeyPath({
                  style: node.style,
                  shape: node.shape,
                  z: 2,
                  z2: 150,
                  scaleX: 0.25,
                  scaleY: 0.25
              });
              thumbnailGroup.add(sankeyThumbnail);
          }

          if (node instanceof graphic.Rect) {
              const rectThumbnail = new graphic.Rect({
                style: node.style,
                shape: node.shape,
                z: 2,
                z2: 150,
                scaleX: 0.25,
                scaleY: 0.25
              });

              thumbnailGroup.add(rectThumbnail);
          }

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

      if (typeof this._contentRect === 'undefined') {
          this._contentRect = thumbnailGroup.getBoundingRect();
      }

      const offectX = (<number>thumbnailWrapper.shape.width - this._contentRect.width) / 2;
      const offectY = (<number>thumbnailWrapper.shape.height - this._contentRect.height) / 2;

      thumbnailWrapper.x = -offectX;
      thumbnailWrapper.y = -offectY;

      group.add(thumbnailWrapper);
      group.add(thumbnailGroup);

      // layout.positionElement(group, layoutParams.pos, layoutParams.box);

  }

  remove() {
    this.group.removeAll();
  }
}


export default Thumbnail;
