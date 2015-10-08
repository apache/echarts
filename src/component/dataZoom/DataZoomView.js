define(function (require) {

    var echarts = require('../../echarts');
    var zrUtil = require('zrender/core/util');
    var DataZoomLayout = require('./DataZoomLayout');
    var graphic = require('../../util/graphic');

    // Constants
    var DEFAULT_FRAME_BORDER_WIDTH = 1;
    var DEFAULT_HANDLE_INNER_COLOR = '#fff';

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

    return echarts.extendComponentView({

        type: 'dataZoom',

        init: function (ecModel, api) {
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

            this.api = api;
        },

        render: function (dataZoomModel, ecModel, api, event) {
            // FIXME
            // 需要区别用户事件在本component上触发的render和其他render。
            // 后者不重新构造shape。否则难于实现拖拽。
            this.dataZoomModel = dataZoomModel;
            this.ecModel = ecModel;

            this._orient = dataZoomModel.get('orient');

            if (!event || event.type !== 'dataZoom' || event.from !== this.uid) {
                var group = this.group;

                group.removeAll();

                if (this.dataZoomModel.get('show') === false) {
                    return;
                }

                // Layout
                var layoutIns = this._layout = new DataZoomLayout(dataZoomModel, ecModel, api);
                layoutIns.reset();

                // Render
                group.position[0] = layoutIns.layout.x;
                group.position[1] = layoutIns.layout.y;

                this._renderBackground();
                this._renderDataShadow();
                this._renderFrame();
                this._renderFiller();
                this._renderHandle();
            }
        },

        _renderBackground : function () {
            var dataZoomModel = this.dataZoomModel;
            var layout = this._layout.layout;

            this.group.add(new graphic.Rect({
                // FIXME
                // zlevel: this.getZlevelBase(),
                // z: this.getZBase(),
                silent: true,
                shape: {
                    x: 0,
                    y: 0,
                    width: layout.width,
                    height: layout.height
                },
                style: {
                    fill: dataZoomModel.get('backgroundColor')
                }
            }));
        },

        _renderFrame: function () {
            zrUtil.each(['startFrame', 'endFrame'], function (name) {

                var cfg = {
                    // FIXME
                    // zlevel: this.getZlevelBase(),
                    // z: this.getZBase(),
                    silent: true,
                    style: {
                        stroke: this.dataZoomModel.get('handleColor'),
                        lineWidth: DEFAULT_FRAME_BORDER_WIDTH,
                        fill: 'rgba(0,0,0,0)'
                    }
                };
                cfg = zrUtil.merge(cfg, this._layout.layout[name]);

                this.group.add(this._updatableShapes[name] = new graphic.Rect(cfg));

            }, this);
        },

        _renderDataShadow: function () {
            // Data shadow
            // TODO
        },

        _renderFiller: function () {
            var cfg = {
                // FIXME
                // zlevel: this.getZlevelBase(),
                // z: this.getZBase(),
                draggable: true,
                cursor: 'move',
                drift: zrUtil.bind(this._onDrift, this, this._getUpdateArg()),
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
            };
            cfg = zrUtil.merge(cfg, this._layout.layout.filler);

            this.group.add(this._updatableShapes.filler = new graphic.Rect(cfg));
        },

        _renderHandle: function () {
            // FIXME
            // var detailInfo = this.zoomOption.showDetail ? this._getDetail() : {start: '',end: ''};

            zrUtil.each(['handle1', 'handle2'], function (name) {

                var cfg = {
                    style: {
                        fill: this.dataZoomModel.get('handleColor'),
                        textColor: DEFAULT_HANDLE_INNER_COLOR,
                        text: '=',
                        textPosition: 'inside'
                    },
                    cursor: 'move',
                    draggable: true,
                    drift: zrUtil.bind(this._onDrift, this, this._getUpdateArg(name)),
                    ondragend: zrUtil.bind(this._onDragEnd, this)
                };
                cfg = zrUtil.merge(cfg, this._layout.layout[name]);

                this.group.add(this._updatableShapes[name] = new graphic.Rect(cfg));

            }, this);
        },

        _updateView: function () {
            // Only shape can be modified.
            // So only update shape for convenience and performance.
            zrUtil.each(this._updatableShapes, function (shape, name) {
                shape.attr('shape', subPixelOptimize(this._layout.layout[name].shape, name));
            }, this);
        },

        _getUpdateArg: function (arg) {
            return (arg && !this.dataZoomModel.get('zoomLock'))
                ? arg : null;
        },

        _getDetailInfo: function () {

        },

        _onDrift: function (rangeArg, dx, dy) {
            var dataZoomModel = this.dataZoomModel;

            this._layout.update({rangeArg: rangeArg, dx: dx, dy: dy});

            this._updateView();

            if (dataZoomModel.get('realtime')) {
                // FIXME
                // if (this.zoomOption.showDetail) {
                // }

                this.api.dispatch({
                    type: 'dataZoom',
                    from: this.uid,
                    dataZoomModelId: dataZoomModel.uid,
                    dataZoomRange: this._layout.normalizeToRange()
                });
            }

            return true;
        },

        _onDragEnd : function () {
            // FIXME
            // if (this.zoomOption.showDetail) {
            // }
            var dataZoomModel = this.dataZoomModel;

            if (!dataZoomModel.get('realtime')) {
                this.api.dispatch({
                    type: 'dataZoom',
                    from: this.uid,
                    dataZoomModelId: dataZoomModel.uid,
                    dataZoomRange: this._layout.normalizeToRange()
                });
            }
        }

    });
});