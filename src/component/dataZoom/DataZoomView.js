define(function (require) {

    var echarts = require('../../echarts');
    var zrUtil = require('zrender/core/util');
    var DataZoomLayout = require('./DataZoomLayout');
    var graphic = require('../../util/graphic');

    // Constants
    var DEFAULT_FRAME_BORDER_WIDTH = 1;
    var DEFAULT_HANDLE_INNER_COLOR = '#fff';

    return echarts.extendComponentView({

        type: 'dataZoom',

        init: function () {
            /**
             * @private
             * @type {Object}
             */
            this._updatableShapes = {};

            /**
             * @private
             * @type {module:echarts/component/dataZoom/DataZoomLayout}
             */
            this._layout;

            /**
             * @private
             * @type {string}
             */
            this._orient;
        },

        render: function (dataZoomModel, ecModel, api, event) {
            // FIXME
            // 需要区别用户事件在本component上触发的render和其他render。
            // 后者不重新构造shape。否则难于实现拖拽。

            this.dataZoomModel = dataZoomModel;
            this.ecModel = ecModel;
            this.api = api;

            this._orient = dataZoomModel.get('orient');

            if (!event || event.type !== 'dataZoom' || event.from !== this.uid) {
                this.group.clear();

                if (this.dataZoomModel.get('show') === false) {
                    return;
                }

                // Layout
                this._layout = new DataZoomLayout(dataZoomModel, ecModel, api);
                this._layout.reset();

                // Render
                this._renderBackground();
                this._renderDataShadow();
                this._renderFrame();
                this._renderFiller();
                this._renderHandle();
            }
        },

        _renderBackground : function () {
            var dataZoomModel = this.dataZoomModel;
            var location = this._layout.layout.location;

            this.group.add(new this.api.Rect({
                // FIXME
                // zlevel: this.getZlevelBase(),
                // z: this.getZBase(),
                hoverable:false,
                shape: {
                    x: location.x,
                    y: location.y,
                    width: location.width,
                    height: location.height
                },
                style: {
                    fill: dataZoomModel.get('backgroundColor')
                }
            }));
        },

        _renderFrame: function () {
            var updatableShapes = this._updatableShapes;
            var layout = this._layout.layout;
            var baseFrame = {
                // FIXME
                // zlevel: this.getZlevelBase(),
                // z: this.getZBase(),
                hoverable: false,
                style: {
                    stroke: this.dataZoomModel.get('handleColor'),
                    lineWidth: DEFAULT_FRAME_BORDER_WIDTH,
                    fill: 'rgba(0,0,0,0)'
                }
            };
            this.group
                .add(updatableShapes.startFrame = new this.api.Rect(zrUtil.mergeAll(
                    {},
                    baseFrame,
                    layout.startFrame
                )))
                .add(updatableShapes.endFrame = new this.api.Rect(zrUtil.mergeAll(
                    {},
                    baseFrame,
                    layout.endFrame
                )));
        },

        _renderDataShadow: function () {
            // Data shadow
            // TODO
        },

        _renderFiller: function () {
            this.group.add(
                this._updatableShapes.filler = new this.api.Rect(zrUtil.merge(
                    {
                        // FIXME
                        // zlevel: this.getZlevelBase(),
                        // z: this.getZBase(),
                        draggable: this._orient,
                        drift: zrUtil.bind(this._onDrift, this, this._getUpdateArgs()),
                        ondragend: zrUtil.bind(this._onDragEnd, this),
                        style: {
                            fill: this.dataZoomModel.get('fillerColor'),
                            text: this._orient === 'horizontal' ? ':::' : '::',
                            textPosition : 'inside'
                        }
                        // FIXME
                        // highlightStyle: {
                        //     brushType: 'fill',
                        //     color: 'rgba(0,0,0,0)'
                        // }
                    },
                    this._layout.layout.filler
                ))
            );
        },

        _renderHandle: function () {
            var dataZoomModel = this.dataZoomModel;
            var layout = this._layout.layout;
            var updatableShapes = this._updatableShapes;
            // FIXME
            // var detailInfo = this.zoomOption.showDetail ? this._getDetail() : {start: '',end: ''};

            var baseHandle = {
                // FIXME
                // zlevel: this.getZlevelBase(),
                // z: this.getZBase(),
                draggable: this._orient,
                style: {
                    fill: dataZoomModel.get('handleColor'),
                    textColor: DEFAULT_HANDLE_INNER_COLOR,
                    text: '=',
                    textPosition: 'inside'
                }
                // FIXME
                // highlightStyle: {
                //     text: detail.start,
                //     brushType: 'fill',
                //     textPosition: 'left'
                // },
            };

            this.group
                .add(updatableShapes.handle1 = new this.api.Rect(zrUtil.mergeAll(
                    {
                        drift: zrUtil.bind(this._onDrift, this, this._getUpdateArgs('handle1')),
                        ondragend: zrUtil.bind(this._onDragEnd, this)
                    },
                    baseHandle,
                    layout.handle1
                )))
                .add(updatableShapes.handle2 = new this.api.Rect(zrUtil.mergeAll(
                    {
                        drift: zrUtil.bind(this._onDrift, this, this._getUpdateArgs('handle2')),
                        ondragend: zrUtil.bind(this._onDragEnd, this)
                    },
                    baseHandle,
                    layout.handle2
                )));
        },

        _updateView: function () {
            // Only shape can be modified.
            // So only update shape for convenience and performance.
            zrUtil.each(this._updatableShapes, function (shape, name) {
                shape.attr('shape', subPixelOptimize(this._layout.layout[name].shape, name));
            }, this);

            function subPixelOptimize(shape, name) {
                var subPixelOptimizeLineWidth = {
                    startFrame: DEFAULT_FRAME_BORDER_WIDTH,
                    endFrame: DEFAULT_FRAME_BORDER_WIDTH
                };
                if (subPixelOptimizeLineWidth.hasOwnProperty(name)) {
                    shape = graphic.subPixelOptimizeRect({
                        shape: shape,
                        style: {lineWidth: subPixelOptimizeLineWidth[name]}
                    }).shape;
                }
                return shape;
            }
        },

        _getUpdateArgs: function (arg) {
            return (!arg || this.dataZoomModel.get('zoomLock'))
                ? ['handle1', 'handle2']
                : [arg];
        },

        _onDrift: function (rangeArgs, dx, dy) {
            var dataZoomModel = this.dataZoomModel;

            this._layout.update({rangeArgs: rangeArgs, dx: dx, dy: dy});

            this._updateView();

            if (dataZoomModel.get('realtime')) {
                // FIXME
                // if (this.zoomOption.showDetail) {
                // }

                this.api.dispatch({
                    type: 'dataZoom',
                    from: this.uid,
                    dataZoomModelId: this.dataZoomModel.uid,
                    dataZoomRange: this._layout.normalizeToRange()
                });
            }

            return true;
        },

        _onDragEnd : function () {
            // FIXME
            // if (this.zoomOption.showDetail) {
            // }
        }

    });
});