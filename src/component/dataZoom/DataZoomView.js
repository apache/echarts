define(function (require) {

    var echarts = require('../../echarts');
    var zrUtil = require('zrender/core/util');
    var helper = require('./helper');
    var retrieveValue = helper.retrieveValue;

    // Constants
    var DEFAULT_LOCATION_EDGE_GAP = 2;
    var DEFAULT_FILLER_SIZE = 30;

    return echarts.extendComponentView({

        type: 'dataZoom',

        init: function (echarts) {
            this._location;
        },

        render: function (dataZoomModel, ecModel, api, event) {
            // FIXME
            // 需要区别用户事件在本component上触发的render和其他render。
            // 后者不重新构造shape。否则难于实现拖拽。

            this._dataZoomModel = dataZoomModel;
            this._ecModel = ecModel;
            this._api = api;
            this._orient = dataZoomModel.get('orient');

            if (!event || event.type !== 'dataZoom' || event.from !== this.uid) {
                this.group.clear();

                if (this.dataZoomModel.get('show') === false) {
                    return;
                }

                // Layout
                this._updateLocation();
                this._updateSliderRange({init: true});
                this._updateWidgetSize();

                // Render
                this._renderBackground();
                this._renderDataShadow();
            }
        },

        /**
         * 根据选项计算实体的位置坐标
         */
        _updateLocation: function () {
            var dataZoomModel = this._dataZoomModel;
            var x;
            var y;
            var width;
            var height;
            // If some of x/y/width/height are not specified, auto-adapt according to target grid.
            var gridRect = this._findGridRectForLocating();

            if (this._orient === 'horizontal') { // Horizontal layout
                width = retrieveValue(dataZoomModel.get('width'), gridRect.width);
                height = retrieveValue(dataZoomModel.get('height'), DEFAULT_FILLER_SIZE);
                x = retrieveValue(dataZoomModel.get('x'), gridRect.x);
                y = retrieveValue(
                    dataZoomModel.get('y'), (api.getHeight() - height - DEFAULT_LOCATION_EDGE_GAP)
                );
            }
            else { // Vertical layout
                width = retrieveValue(dataZoomModel.get('width'), DEFAULT_FILLER_SIZE);
                height = retrieveValue(dataZoomModel.get('height'), gridRect.height);
                x = retrieveValue(dataZoomModel.get('x'), DEFAULT_LOCATION_EDGE_GAP);
                y = retrieveValue(dataZoomModel.get('y'), gridRect.y);
            }

            this._location = {
                x: x, y: y, width: width, height: height
            };
        },

        /**
         * @private
         * @param  {Object} dataZoomModel
         * @param  {Object} operation
         * @param  {boolean} [operation.init]
         * @param  {string} [operation.rangeArg] 'start' or 'end'
         * @param  {number} [operation.dx]
         * @param  {number} [operation.dy]
         */
        _updateSliderRange: function (operation) {
            // Based on this._location.
            if (operation.init) {
                var dataZoomModel = this._dataZoomModel;
                var range = dataZoomModel.getRange();
                var sliderTotalLength = this._getSliderTotalLength();

                this._sliderRange = {
                    start: Math.round(range.start * 100 / sliderTotalLength),
                    end: Math.round(range.end * 100 / sliderTotalLength)
                };
            }
            if (operation.rangeArg) {
                this._sliderRange[operation.rangeArg] += this._getSliderDelta(operation);
            }
        },

        _getSliderTotalLength: function () {
            var location = this._location;
            return this._orient === 'horizontal' ? location.width : location.height;
        },

        _getSliderDelta: function (operation) {
            return retrieveValue(
                this._orient === 'horizontal' ? operation.dx : operation.dy,
                0
            );
        },

        _normalizeToRange: function () {
            var sliderTotalLength = this._getSliderTotalLength();
            var sliderRange = this._sliderRange;
            return {
                start: sliderRange.start / sliderTotalLength * 100,
                end: sliderRange.end / sliderTotalLength * 100
            };
        },

        _updateWidgetSize: function () {
            // Based on this._sliderRange and this._location.
            var dataZoomModel = this._dataZoomModel;
            var sliderRange = this._sliderRange;
            var location = this._location;
            var handleSize = dataZoomModel.get('handleSize');
            var widgetSize = this._widgetSize = {};

            if (dataZoomModel.get('orient') === 'horizontal') {
                widgetSize.filler = {
                    x: location.x + sliderRange.start + handleSize,
                    y: location.y,
                    width: sliderRange.end - sliderRange.start - handleSize * 2,
                    height: location.height
                };
            }
            else { // 'vertical'
                widgetSize.filler = {
                    x: location.x,
                    y: location.y + sliderRange.start + handleSize,
                    width: location.width,
                    height: sliderRange.end - sliderRange.start - handleSize * 2
                };
            }
        },

        _findGridRectForLocating: function () {
            // Find the grid coresponding to the first axis referred by dataZoom.
            var axisModel;
            var dataZoomModel = this._dataZoomModel;
            var ecModel = this._ecModel;

            helper.eachAxisDim(function (dimNames) {
                var axisIndices = dataZoomModel.get(dimNames.axisIndex);
                if (!axisModel && axisIndices.length) {
                    axisModel = ecModel.get(dimNames.axis)[axisIndices[0]];
                }
            });
            return ecModel.getComponent('grid', axisModel.get('gridIndex')).getRect();
        },

        _renderBackground : function () {
            var dataZoomModel = this._dataZoomModel;
            var location = this._location;

            this.group.push(new api.Rect({
                // FIXME
                // zlevel: this.getZlevelBase(),
                // z: this.getZBase(),
                hoverable:false,
                style: {
                    x: location.x,
                    y: location.y,
                    width: location.width,
                    height: location.height,
                    color: dataZoomModel.get('backgroundColor')
                }
            }));
        },

        _renderDataShadow: function () {
            // Data shadow
            // TODO
        },

        _renderFiller: function () {
            var dataZoomModel = this._dataZoomModel;
            var orient = dataZoomModel.get('orient');

            this._fillerShape = new api.Rect({
                // FIXME
                // zlevel: this.getZlevelBase(),
                // z: this.getZBase(),
                draggable: true,
                ondrift: zrUtil.bind(this._onDrift, this, 'both'),
                ondragend: zrUtil.bind(this._onDragEnd, this),
                style: zrUtil.merge(
                    {
                        color: dataZoomModel.get('fillerColor'),
                        text: orient === 'horizontal' ? ':::' : '::',
                        textPosition : 'inside'
                    },
                    this._widgetSize
                ),
                highlightStyle: {
                    brushType: 'fill',
                    color: 'rgba(0,0,0,0)'
                }
            });

            this.group.push(this._fillerShape);
        },

        _renderHandle : function () {
            var detail = this.zoomOption.showDetail ? this._getDetail() : {start: '',end: ''};
            this._startShape = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                draggable : true,
                style : {
                    iconType: 'rectangle',
                    x: this._location.x,
                    y: this._location.y,
                    width: this._handleSize,
                    height: this._handleSize,
                    color: this.zoomOption.handleColor,
                    text: '=',
                    textPosition: 'inside'
                },
                highlightStyle: {
                    text: detail.start,
                    brushType: 'fill',
                    textPosition: 'left'
                },
                ondrift: this._ondrift,
                ondragend: this._ondragend
            };

            if (this.zoomOption.orient === 'horizontal') {
                this._startShape.style.height = this._location.height;
                this._endShape = zrUtil.clone(this._startShape);

                this._startShape.style.x = this._fillerShae.style.x - this._handleSize,
                this._endShape.style.x = this._fillerShae.style.x + this._fillerShae.style.width;
                this._endShape.highlightStyle.text = detail.end;
                this._endShape.highlightStyle.textPosition = 'right';
            }
            else {
                this._startShape.style.width = this._location.width;
                this._endShape = zrUtil.clone(this._startShape);

                this._startShape.style.y = this._fillerShae.style.y + this._fillerShae.style.height;
                this._startShape.highlightStyle.textPosition = 'bottom';

                this._endShape.style.y = this._fillerShae.style.y - this._handleSize;
                this._endShape.highlightStyle.text = detail.end;
                this._endShape.highlightStyle.textPosition = 'top';
            }
            this._startShape = new IconShape(this._startShape);
            this._endShape = new IconShape(this._endShape);
            this.shapeList.push(this._startShape);
            this.shapeList.push(this._endShape);
        },

        _onDrift : function (rangeArg, dx, dy) {
            var dataZoomModel = this._dataZoomModel;

            if (rangeArg === 'both' || dataZoomModel.get('zoomLock')) {
                this._updateSliderRange({rangeArg: 'start', dx: dx, dy: dy});
                this._updateSliderRange({rangeArg: 'end', dx: dx, dy: dy});
            }
            else { // rangeArg === 'start' or 'end'
                this._updateSliderRange({rangeArg: rangeArg, dx: dx, dy: dy});
            }

            // FIXME
            // refresh shape location

            // FIXME
            if (dataZoomModel.get('realtime')) {
                // this._syncData();
            }

            // FIXME
            if (this.zoomOption.showDetail) {
                // var detail = this._getDetail();
                // this._startShape.style.text = this._startShape.highlightStyle.text = detail.start;
                // this._endShape.style.text = this._endShape.highlightStyle.text = detail.end;
                // this._startShape.style.textPosition = this._startShape.highlightStyle.textPosition;
                // this._endShape.style.textPosition = this._endShape.highlightStyle.textPosition;
            }

            this._api.dispatch({
                type: 'dataZoom',
                from: this.uid,
                param: this._normalizeToRange(),
                targetModel: this._dataZoomModel
            });

            // FIXME
            return true;
        },

        _onDragEnd : function () {
            // if (this.zoomOption.showDetail) {
            //     this._startShape.style.text = this._endShape.style.text = '=';
            //     this._startShape.style.textPosition = this._endShape.style.textPosition = 'inside';
            //     this.zr.modShape(this._startShape.id);
            //     this.zr.modShape(this._endShape.id);
            //     this.zr.refreshNextFrame();
            // }
            // this.isDragend = true;
        },

    });
});