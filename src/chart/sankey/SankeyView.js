/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

/**
 * @file  The file used to draw sankey view
 * @author  Deqing Li(annong035@gmail.com)
 */

import * as graphic from '../../util/graphic';
import * as echarts from '../../echarts';

var SankeyShape = graphic.extendShape({
    shape: {
        x1: 0, y1: 0,
        x2: 0, y2: 0,
        cpx1: 0, cpy1: 0,
        cpx2: 0, cpy2: 0,

        extent: 0
    },

    buildPath: function (ctx, shape) {
        var halfExtent = shape.extent / 2;
        ctx.moveTo(shape.x1, shape.y1 - halfExtent);
        ctx.bezierCurveTo(
            shape.cpx1, shape.cpy1 - halfExtent,
            shape.cpx2, shape.cpy2 - halfExtent,
            shape.x2, shape.y2 - halfExtent
        );
        ctx.lineTo(shape.x2, shape.y2 + halfExtent);
        ctx.bezierCurveTo(
            shape.cpx2, shape.cpy2 + halfExtent,
            shape.cpx1, shape.cpy1 + halfExtent,
            shape.x1, shape.y1 + halfExtent
        );
        ctx.closePath();
    }
});

export default echarts.extendChartView({

    type: 'sankey',

    /**
     * @private
     * @type {module:echarts/chart/sankey/SankeySeries}
     */
    _model: null,

    render: function (seriesModel, ecModel, api) {
        var graph = seriesModel.getGraph();
        var group = this.group;
        var layoutInfo = seriesModel.layoutInfo;
        // view width
        var width = layoutInfo.width;
        // view height
        var height = layoutInfo.height;
        
        var nodeData = seriesModel.getData();
        var edgeData = seriesModel.getData('edge');

        this._model = seriesModel;

        group.removeAll();

        group.attr('position', [layoutInfo.x, layoutInfo.y]);

        // generate a bezire Curve for each edge
        graph.eachEdge(function (edge) {
            var curve = new SankeyShape();
            curve.dataIndex = edge.dataIndex;
            curve.seriesIndex = seriesModel.seriesIndex;
            curve.dataType = 'edge';
            var lineStyleModel = edge.getModel('lineStyle');
            var curvature = lineStyleModel.get('curveness');
            var n1Layout = edge.node1.getLayout();
            var node1Model =edge.node1.getModel();
            var dragX1 = node1Model.get('localX');
            var dragY1 = node1Model.get('localY');
            var n2Layout = edge.node2.getLayout();
            var node2Model = edge.node2.getModel();
            var dragX2 = node2Model.get('localX');
            var dragY2 = node2Model.get('localY');
            var edgeLayout = edge.getLayout();

            curve.shape.extent = Math.max(1, edgeLayout.dy);

            var x1 = (dragX1 != null ? dragX1 * width : n1Layout.x) + n1Layout.dx;
            var y1 = (dragY1 != null ? dragY1 * height : n1Layout.y) + edgeLayout.sy + edgeLayout.dy / 2;
            var x2 = dragX2 != null ? dragX2 * width : n2Layout.x;
            var y2 = (dragY2 != null ? dragY2 * height : n2Layout.y) + edgeLayout.ty + edgeLayout.dy / 2;
            var cpx1 = x1 * (1 - curvature) + x2 * curvature;
            var cpy1 = y1;
            var cpx2 = x1 * curvature + x2 * (1 - curvature);
            var cpy2 = y2;

            curve.setShape({
                x1: x1,
                y1: y1,
                x2: x2,
                y2: y2,
                cpx1: cpx1,
                cpy1: cpy1,
                cpx2: cpx2,
                cpy2: cpy2
            });

            curve.setStyle(lineStyleModel.getItemStyle());
            // Special color, use source node color or target node color
            switch (curve.style.fill) {
                case 'source':
                    curve.style.fill = edge.node1.getVisual('color');
                    break;
                case 'target':
                    curve.style.fill = edge.node2.getVisual('color');
                    break;
            }

            graphic.setHoverStyle(curve, edge.getModel('emphasis.lineStyle').getItemStyle());

            group.add(curve);

            edgeData.setItemGraphicEl(edge.dataIndex, curve);
        });

        // generate a rect for each node
        graph.eachNode(function (node) {
            var layout = node.getLayout();
            var itemModel = node.getModel();
            var dragX = itemModel.get('localX');
            var dragY = itemModel.get('localY');
            var labelModel = itemModel.getModel('label');
            var labelHoverModel = itemModel.getModel('emphasis.label');

            var rect = new graphic.Rect({
                shape: {
                    x: dragX != null ? dragX * width : layout.x,
                    y: dragY != null ? dragY * height : layout.y,
                    width: layout.dx,
                    height: layout.dy
                },
                style: itemModel.getModel('itemStyle').getItemStyle()
            });

            var hoverStyle = node.getModel('emphasis.itemStyle').getItemStyle();

            graphic.setLabelStyle(
                rect.style, hoverStyle, labelModel, labelHoverModel,
                {
                    labelFetcher: seriesModel,
                    labelDataIndex: node.dataIndex,
                    defaultText: node.id,
                    isRectText: true
                }
            );

            rect.setStyle('fill', node.getVisual('color'));

            graphic.setHoverStyle(rect, hoverStyle);

            group.add(rect);

            nodeData.setItemGraphicEl(node.dataIndex, rect);

            rect.dataType = 'node';
        });

        var draggable = seriesModel.get('draggable');
        if (draggable) {
            nodeData.eachItemGraphicEl(function (el, dataIndex) {
                el.drift = function (dx, dy) {
                    this.shape.x += dx;
                    this.shape.y += dy;
                    this.dirty();
                    api.dispatchAction({
                        type: 'dragNode',
                        seriesId: seriesModel.id,
                        dataIndex: nodeData.getRawIndex(dataIndex),
                        localX: this.shape.x / width,
                        localY: this.shape.y / height
                    });
                };
        
                el.draggable = true;
                el.cursor = 'move';
            });
        }
        
        if (!this._data && seriesModel.get('animation')) {
            group.setClipPath(createGridClipShape(group.getBoundingRect(), seriesModel, function () {
                group.removeClipPath();
            }));
        }

        this._data = seriesModel.getData();
    },

    dispose: function () {}
});

// add animation to the view
function createGridClipShape(rect, seriesModel, cb) {
    var rectEl = new graphic.Rect({
        shape: {
            x: rect.x - 10,
            y: rect.y - 10,
            width: 0,
            height: rect.height + 20
        }
    });
    graphic.initProps(rectEl, {
        shape: {
            width: rect.width + 20,
            height: rect.height + 20
        }
    }, seriesModel, cb);

    return rectEl;
}