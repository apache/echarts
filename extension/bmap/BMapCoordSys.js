define(function (require) {
    var echarts = require('echarts');

    function BMapCoordSys(bmap, api) {
        this._bmap = bmap;
        this.dimensions = ['lng', 'lat'];
        this._mapOffset = [0, 0];

        this._api = api;
    }

    BMapCoordSys.prototype.dimensions = ['lng', 'lat'];

    BMapCoordSys.prototype.setMapOffset = function (mapOffset) {
        this._mapOffset = mapOffset;
    };

    BMapCoordSys.prototype.getBMap = function () {
        return this._bmap;
    };

    BMapCoordSys.prototype.dataToPoint = function (data) {
        var point = new BMap.Point(data[0], data[1]);
        var px = this._bmap.pointToOverlayPixel(point);
        var mapOffset = this._mapOffset;
        return [px.x - mapOffset[0], px.y - mapOffset[1]];
    };

    BMapCoordSys.prototype.pointToData = function (pt) {
        var mapOffset = this._mapOffset;
        var pt = this._bmap.overlayPixelToPoint({
            x: pt[0] + mapOffset[0],
            y: pt[1] + mapOffset[1]
        });
        return [pt.lng, pt.lat];
    };

    BMapCoordSys.prototype.getViewRect = function () {
        var api = this._api;
        return new echarts.graphic.BoundingRect(0, 0, api.getWidth(), api.getHeight());
    };

    BMapCoordSys.prototype.getRoamTransform = function () {
        return echarts.matrix.create();
    };

    var Overlay;
    BMapCoordSys.create = function (ecModel, api) {
        var bmapCoordSys;
        var root = api.getDom();

        // TODO Dispose
        ecModel.eachComponent('bmap', function (bmapModel) {
            if (typeof BMap === 'undefined') {
                throw new Error('BMap api is not loaded');
            }
            if (!Overlay) {
                Overlay = function (root) {
                    this._root = root;
                }

                Overlay.prototype = new BMap.Overlay();
                /**
                 * 初始化
                 *
                 * @param {BMap.Map} map
                 * @override
                 */
                Overlay.prototype.initialize = function (map) {
                    map.getPanes().labelPane.appendChild(this._root);
                    return this._root;
                };
                /**
                 * @override
                 */
                Overlay.prototype.draw = function () {};

            }
            if (bmapCoordSys) {
                throw new Error('Only one bmap component can exist');
            }
            if (!bmapModel.__bmap) {
                var bmapRoot = root.querySelector('.ec-extension-bmap');
                // Not support IE8
                if (bmapRoot) {
                    bmapRoot.parentNode.removeChild(bmapRoot);
                }
                bmapRoot = document.createElement('div');
                bmapRoot.style.cssText = 'width:100%;height:100%';
                var viewportRoot = api.getZr().painter.getViewportRoot();
                root.insertBefore(bmapRoot, viewportRoot);
                var bmap = bmapModel.__bmap = new BMap.Map(bmapRoot);

                var overlay = new Overlay(viewportRoot);
                bmap.addOverlay(overlay);

                // Set bmap options
                var center = bmapModel.get('center');
                if (center) {
                    var pt = new BMap.Point(center[0], center[1]);
                    bmap.centerAndZoom(pt, bmapModel.get('zoom'));
                }
                var roam = bmapModel.get('roam');
                if (roam && roam !== 'scale') {
                    bmap.enableDragging();
                }
                else {
                    bmap.disableDragging();
                }
                if (roam && roam !== 'move') {
                    bmap.enableScrollWheelZoom();
                    bmap.enableDoubleClickZoom();
                    bmap.enablePinchToZoom();
                }
                else {
                    bmap.disableScrollWheelZoom();
                    bmap.disableDoubleClickZoom();
                    bmap.disablePinchToZoom();
                }

                bmap.setMapStyle(bmapModel.get('mapStyle'));

                var moveHandler = function () {
                    var offsetEl = viewportRoot.parentNode.parentNode.parentNode;
                    var mapOffset = [
                        -parseInt(offsetEl.style.left) || 0,
                        -parseInt(offsetEl.style.top) || 0
                    ];
                    viewportRoot.style.left = mapOffset[0] + 'px';
                    viewportRoot.style.top = mapOffset[1] + 'px';

                    bmapCoordSys.setMapOffset(mapOffset);
                    bmapModel.__mapOffset = mapOffset;

                    api.dispatchAction({
                        type: 'bmapRoam'
                    });
                };

                bmap.addEventListener('moving', moveHandler);
                bmap.addEventListener('moveend', moveHandler);
                bmap.addEventListener('zoomend', function () {
                    api.dispatchAction({
                        type: 'bmapRoam'
                    });
                });
            }
            bmapCoordSys = new BMapCoordSys(bmapModel.__bmap, api);
            bmapCoordSys.setMapOffset(bmapModel.__mapOffset || [0, 0]);
            bmapModel.coordinateSystem = bmapCoordSys;
        });

        ecModel.eachSeries(function (seriesModel) {
            var coordSys = seriesModel.get('coordinateSystem');
            if (coordSys === 'bmap') {
                seriesModel.coordinateSystem = bmapCoordSys;
            }
        });
    };

    return BMapCoordSys;
});