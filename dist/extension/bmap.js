(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('echarts')) : typeof define === 'function' && define.amd ? define(['exports', 'echarts'], factory) : (global = global || self, factory(global.bmap = {}, global.echarts));
})(this, function (exports, echarts) {
  'use strict';

  function BMapCoordSys(bmap, api) {
    this._bmap = bmap;
    this.dimensions = ['lng', 'lat'];
    this._mapOffset = [0, 0];
    this._api = api;
    this._projection = new BMap.MercatorProjection();
  }

  BMapCoordSys.prototype.dimensions = ['lng', 'lat'];

  BMapCoordSys.prototype.setZoom = function (zoom) {
    this._zoom = zoom;
  };

  BMapCoordSys.prototype.setCenter = function (center) {
    this._center = this._projection.lngLatToPoint(new BMap.Point(center[0], center[1]));
  };

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
    pt = this._bmap.overlayPixelToPoint({
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

  BMapCoordSys.prototype.prepareCustoms = function () {
    var rect = this.getViewRect();
    return {
      coordSys: {
        type: 'bmap',
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      },
      api: {
        coord: echarts.util.bind(this.dataToPoint, this),
        size: echarts.util.bind(dataToCoordSize, this)
      }
    };
  };

  function dataToCoordSize(dataSize, dataItem) {
    dataItem = dataItem || [0, 0];
    return echarts.util.map([0, 1], function (dimIdx) {
      var val = dataItem[dimIdx];
      var halfSize = dataSize[dimIdx] / 2;
      var p1 = [];
      var p2 = [];
      p1[dimIdx] = val - halfSize;
      p2[dimIdx] = val + halfSize;
      p1[1 - dimIdx] = p2[1 - dimIdx] = dataItem[1 - dimIdx];
      return Math.abs(this.dataToPoint(p1)[dimIdx] - this.dataToPoint(p2)[dimIdx]);
    }, this);
  }

  var Overlay;
  BMapCoordSys.dimensions = BMapCoordSys.prototype.dimensions;

  function createOverlayCtor() {
    function Overlay(root) {
      this._root = root;
    }

    Overlay.prototype = new BMap.Overlay();

    Overlay.prototype.initialize = function (map) {
      map.getPanes().labelPane.appendChild(this._root);
      return this._root;
    };

    Overlay.prototype.draw = function () {};

    return Overlay;
  }

  BMapCoordSys.create = function (ecModel, api) {
    var bmapCoordSys;
    var root = api.getDom();
    ecModel.eachComponent('bmap', function (bmapModel) {
      var painter = api.getZr().painter;
      var viewportRoot = painter.getViewportRoot();

      if (typeof BMap === 'undefined') {
        throw new Error('BMap api is not loaded');
      }

      Overlay = Overlay || createOverlayCtor();

      if (bmapCoordSys) {
        throw new Error('Only one bmap component can exist');
      }

      var bmap;

      if (!bmapModel.__bmap) {
        var bmapRoot = root.querySelector('.ec-extension-bmap');

        if (bmapRoot) {
          viewportRoot.style.left = '0px';
          viewportRoot.style.top = '0px';
          root.removeChild(bmapRoot);
        }

        bmapRoot = document.createElement('div');
        bmapRoot.style.cssText = 'width:100%;height:100%';
        bmapRoot.classList.add('ec-extension-bmap');
        root.appendChild(bmapRoot);
        bmap = bmapModel.__bmap = new BMap.Map(bmapRoot);
        var overlay = new Overlay(viewportRoot);
        bmap.addOverlay(overlay);

        painter.getViewportRootOffset = function () {
          return {
            offsetLeft: 0,
            offsetTop: 0
          };
        };
      }

      bmap = bmapModel.__bmap;
      var center = bmapModel.get('center');
      var zoom = bmapModel.get('zoom');

      if (center && zoom) {
        var pt = new BMap.Point(center[0], center[1]);
        bmap.centerAndZoom(pt, zoom);
      }

      bmapCoordSys = new BMapCoordSys(bmap, api);
      bmapCoordSys.setMapOffset(bmapModel.__mapOffset || [0, 0]);
      bmapCoordSys.setZoom(zoom);
      bmapCoordSys.setCenter(center);
      bmapModel.coordinateSystem = bmapCoordSys;
    });
    ecModel.eachSeries(function (seriesModel) {
      if (seriesModel.get('coordinateSystem') === 'bmap') {
        seriesModel.coordinateSystem = bmapCoordSys;
      }
    });
  };

  function v2Equal(a, b) {
    return a && b && a[0] === b[0] && a[1] === b[1];
  }

  echarts.extendComponentModel({
    type: 'bmap',
    getBMap: function () {
      return this.__bmap;
    },
    setCenterAndZoom: function (center, zoom) {
      this.option.center = center;
      this.option.zoom = zoom;
    },
    centerOrZoomChanged: function (center, zoom) {
      var option = this.option;
      return !(v2Equal(center, option.center) && zoom === option.zoom);
    },
    defaultOption: {
      center: [104.114129, 37.550339],
      zoom: 5,
      mapStyle: {},
      mapStyleV2: {},
      roam: false
    }
  });
  var BUILTIN_OBJECT = {
    '[object Function]': true,
    '[object RegExp]': true,
    '[object Date]': true,
    '[object Error]': true,
    '[object CanvasGradient]': true,
    '[object CanvasPattern]': true,
    '[object Image]': true,
    '[object Canvas]': true
  };
  var TYPED_ARRAY = {
    '[object Int8Array]': true,
    '[object Uint8Array]': true,
    '[object Uint8ClampedArray]': true,
    '[object Int16Array]': true,
    '[object Uint16Array]': true,
    '[object Int32Array]': true,
    '[object Uint32Array]': true,
    '[object Float32Array]': true,
    '[object Float64Array]': true
  };
  var objToString = Object.prototype.toString;
  var arrayProto = Array.prototype;
  var nativeSlice = arrayProto.slice;

  var ctorFunction = function () {}.constructor;

  var protoFunction = ctorFunction ? ctorFunction.prototype : null;

  function clone(source) {
    if (source == null || typeof source !== 'object') {
      return source;
    }

    var result = source;
    var typeStr = objToString.call(source);

    if (typeStr === '[object Array]') {
      if (!isPrimitive(source)) {
        result = [];

        for (var i = 0, len = source.length; i < len; i++) {
          result[i] = clone(source[i]);
        }
      }
    } else if (TYPED_ARRAY[typeStr]) {
      if (!isPrimitive(source)) {
        var Ctor = source.constructor;

        if (Ctor.from) {
          result = Ctor.from(source);
        } else {
          result = new Ctor(source.length);

          for (var i = 0, len = source.length; i < len; i++) {
            result[i] = clone(source[i]);
          }
        }
      }
    } else if (!BUILTIN_OBJECT[typeStr] && !isPrimitive(source) && !isDom(source)) {
      result = {};

      for (var key in source) {
        if (source.hasOwnProperty(key)) {
          result[key] = clone(source[key]);
        }
      }
    }

    return result;
  }

  function bindPolyfill(func, context) {
    var args = [];

    for (var _i = 2; _i < arguments.length; _i++) {
      args[_i - 2] = arguments[_i];
    }

    return function () {
      return func.apply(context, args.concat(nativeSlice.call(arguments)));
    };
  }

  var bind = protoFunction && isFunction(protoFunction.bind) ? protoFunction.call.bind(protoFunction.bind) : bindPolyfill;

  function isFunction(value) {
    return typeof value === 'function';
  }

  function isDom(value) {
    return typeof value === 'object' && typeof value.nodeType === 'number' && typeof value.ownerDocument === 'object';
  }

  var primitiveKey = '__ec_primitive__';

  function isPrimitive(obj) {
    return obj[primitiveKey];
  }

  echarts.extendComponentView({
    type: 'bmap',
    render: function (bMapModel, ecModel, api) {
      var rendering = true;
      var bmap = bMapModel.getBMap();
      var viewportRoot = api.getZr().painter.getViewportRoot();
      var coordSys = bMapModel.coordinateSystem;

      var moveHandler = function (type, target) {
        if (rendering) {
          return;
        }

        var offsetEl = viewportRoot.parentNode.parentNode.parentNode;
        var mapOffset = [-parseInt(offsetEl.style.left, 10) || 0, -parseInt(offsetEl.style.top, 10) || 0];
        viewportRoot.style.left = mapOffset[0] + 'px';
        viewportRoot.style.top = mapOffset[1] + 'px';
        coordSys.setMapOffset(mapOffset);
        bMapModel.__mapOffset = mapOffset;
        api.dispatchAction({
          type: 'bmapRoam'
        });
      };

      function zoomEndHandler() {
        if (rendering) {
          return;
        }

        api.dispatchAction({
          type: 'bmapRoam'
        });
      }

      bmap.removeEventListener('moving', this._oldMoveHandler);
      bmap.removeEventListener('zoomend', this._oldZoomEndHandler);
      bmap.addEventListener('moving', moveHandler);
      bmap.addEventListener('zoomend', zoomEndHandler);
      this._oldMoveHandler = moveHandler;
      this._oldZoomEndHandler = zoomEndHandler;
      var roam = bMapModel.get('roam');

      if (roam && roam !== 'scale') {
        bmap.enableDragging();
      } else {
        bmap.disableDragging();
      }

      if (roam && roam !== 'move') {
        bmap.enableScrollWheelZoom();
        bmap.enableDoubleClickZoom();
        bmap.enablePinchToZoom();
      } else {
        bmap.disableScrollWheelZoom();
        bmap.disableDoubleClickZoom();
        bmap.disablePinchToZoom();
      }

      var originalStyle = bMapModel.__mapStyle;
      var newMapStyle = bMapModel.get('mapStyle') || {};
      var mapStyleStr = JSON.stringify(newMapStyle);

      if (JSON.stringify(originalStyle) !== mapStyleStr) {
        if (Object.keys(newMapStyle).length) {
          bmap.setMapStyle(clone(newMapStyle));
        }

        bMapModel.__mapStyle = JSON.parse(mapStyleStr);
      }

      var originalStyle2 = bMapModel.__mapStyle2;
      var newMapStyle2 = bMapModel.get('mapStyleV2') || {};
      var mapStyleStr2 = JSON.stringify(newMapStyle2);

      if (JSON.stringify(originalStyle2) !== mapStyleStr2) {
        if (Object.keys(newMapStyle2).length) {
          bmap.setMapStyleV2(clone(newMapStyle2));
        }

        bMapModel.__mapStyle2 = JSON.parse(mapStyleStr2);
      }

      rendering = false;
    }
  });
  echarts.registerCoordinateSystem('bmap', BMapCoordSys);
  echarts.registerAction({
    type: 'bmapRoam',
    event: 'bmapRoam',
    update: 'updateLayout'
  }, function (payload, ecModel) {
    ecModel.eachComponent('bmap', function (bMapModel) {
      var bmap = bMapModel.getBMap();
      var center = bmap.getCenter();
      bMapModel.setCenterAndZoom([center.lng, center.lat], bmap.getZoom());
    });
  });
  var version = '1.0.0';
  exports.version = version;
  Object.defineProperty(exports, '__esModule', {
    value: true
  });
});