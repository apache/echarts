define('echarts/chart/wordCloud', [
    'require',
    './base',
    'zrender/shape/Text',
    '../layout/WordCloud',
    '../component/grid',
    '../component/dataRange',
    '../config',
    '../util/ecData',
    'zrender/tool/util',
    'zrender/tool/color',
    '../chart'
], function (require) {
    var ChartBase = require('./base');
    var TextShape = require('zrender/shape/Text');
    var CloudLayout = require('../layout/WordCloud');
    require('../component/grid');
    require('../component/dataRange');
    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');
    ecConfig.wordCloud = {
        zlevel: 0,
        z: 2,
        clickable: true,
        center: [
            '50%',
            '50%'
        ],
        size: [
            '40%',
            '40%'
        ],
        textRotation: [
            0,
            90
        ],
        textPadding: 0,
        autoSize: {
            enable: true,
            minSize: 12
        },
        itemStyle: {
            normal: {
                textStyle: {
                    fontSize: function (data) {
                        return data.value;
                    }
                }
            }
        }
    };
    function Cloud(ecTheme, messageCenter, zr, option, myChart) {
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        this.refresh(option);
    }
    Cloud.prototype = {
        type: ecConfig.CHART_TYPE_WORDCLOUD,
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }
            this._init();
        },
        _init: function () {
            var series = this.series;
            this.backupShapeList();
            var legend = this.component.legend;
            for (var i = 0; i < series.length; i++) {
                if (series[i].type === ecConfig.CHART_TYPE_WORDCLOUD) {
                    series[i] = this.reformOption(series[i]);
                    var serieName = series[i].name || '';
                    this.selectedMap[serieName] = legend ? legend.isSelected(serieName) : true;
                    if (!this.selectedMap[serieName]) {
                        continue;
                    }
                    this.buildMark(i);
                    this._initSerie(series[i]);
                }
            }
        },
        _initSerie: function (serie) {
            var textStyle = serie.itemStyle.normal.textStyle;
            var size = [
                this.parsePercent(serie.size[0], this.zr.getWidth()) || 200,
                this.parsePercent(serie.size[1], this.zr.getHeight()) || 200
            ];
            var center = this.parseCenter(this.zr, serie.center);
            var layoutConfig = {
                size: size,
                wordletype: { autoSizeCal: serie.autoSize },
                center: center,
                rotate: serie.textRotation,
                padding: serie.textPadding,
                font: textStyle.fontFamily,
                fontSize: textStyle.fontSize,
                fontWeight: textStyle.fontWeight,
                fontStyle: textStyle.fontStyle,
                text: function (d) {
                    return d.name;
                },
                data: serie.data
            };
            var clouds = new CloudLayout(layoutConfig);
            var self = this;
            clouds.end(function (d) {
                self._buildShapes(d);
            });
            clouds.start();
        },
        _buildShapes: function (data) {
            var len = data.length;
            for (var i = 0; i < len; i++) {
                this._buildTextShape(data[i], 0, i);
            }
            this.addShapeList();
        },
        _buildTextShape: function (oneText, seriesIndex, dataIndex) {
            var series = this.series;
            var serie = series[seriesIndex];
            var serieName = serie.name || '';
            var data = serie.data[dataIndex];
            var queryTarget = [
                data,
                serie
            ];
            var legend = this.component.legend;
            var defaultColor = legend ? legend.getColor(serieName) : this.zr.getColor(seriesIndex);
            var normal = this.deepMerge(queryTarget, 'itemStyle.normal') || {};
            var emphasis = this.deepMerge(queryTarget, 'itemStyle.emphasis') || {};
            var normalColor = this.getItemStyleColor(normal.color, seriesIndex, dataIndex, data) || defaultColor;
            var emphasisColor = this.getItemStyleColor(emphasis.color, seriesIndex, dataIndex, data) || (typeof normalColor === 'string' ? zrColor.lift(normalColor, -0.2) : normalColor);
            var that = this;
            var textShape = new TextShape({
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                hoverable: true,
                style: {
                    x: 0,
                    y: 0,
                    text: oneText.text,
                    color: normalColor,
                    textFont: [
                        oneText.style,
                        oneText.weight,
                        oneText.size + 'px',
                        oneText.font
                    ].join(' '),
                    textBaseline: 'alphabetic',
                    textAlign: 'center'
                },
                highlightStyle: {
                    brushType: emphasis.borderWidth ? 'both' : 'fill',
                    color: emphasisColor,
                    lineWidth: emphasis.borderWidth || 0,
                    strokeColor: emphasis.borderColor
                },
                position: [
                    oneText.x,
                    oneText.y
                ],
                rotation: [
                    -oneText.rotate / 180 * Math.PI,
                    0,
                    0
                ]
            });
            ecData.pack(textShape, serie, seriesIndex, data, dataIndex, data.name);
            this.shapeList.push(textShape);
        }
    };
    zrUtil.inherits(Cloud, ChartBase);
    require('../chart').define('wordCloud', Cloud);
    return Cloud;
});define('echarts/layout/WordCloud', [
    'require',
    '../layout/WordCloudRectZero',
    'zrender/tool/util'
], function (require) {
    var ZeroArray = require('../layout/WordCloudRectZero');
    var zrUtil = require('zrender/tool/util');
    function CloudLayout(option) {
        this._init(option);
    }
    CloudLayout.prototype = {
        start: function () {
            var board = null;
            var maxWit = 0;
            var maxHit = 0;
            var maxArea = 0;
            var i = -1;
            var tags = [];
            var maxBounds = null;
            var data = this.wordsdata;
            var dfop = this.defaultOption;
            var wordletype = dfop.wordletype;
            var size = dfop.size;
            var that = this;
            var zeroArrayObj = new ZeroArray({
                type: wordletype.type,
                width: size[0],
                height: size[1]
            });
            zeroArrayObj.calculate(function (options) {
                board = options.initarr;
                maxWit = options.maxWit;
                maxHit = options.maxHit;
                maxArea = options.area;
                maxBounds = options.imgboard;
                startStep();
            }, this);
            return this;
            function startStep() {
                that.totalArea = maxArea;
                if (wordletype.autoSizeCal.enable) {
                    that._autoCalTextSize(data, maxArea, maxWit, maxHit, wordletype.autoSizeCal.minSize);
                }
                if (dfop.timer) {
                    clearInterval(dfop.timer);
                }
                dfop.timer = setInterval(step, 0);
                step();
            }
            function step() {
                var start = +new Date();
                var n = data.length;
                var d;
                while (+new Date() - start < dfop.timeInterval && ++i < n && dfop.timer) {
                    d = data[i];
                    d.x = size[0] >> 1;
                    d.y = size[1] >> 1;
                    that._cloudSprite(d, data, i);
                    if (d.hasText && that._place(board, d, maxBounds)) {
                        tags.push(d);
                        d.x -= size[0] >> 1;
                        d.y -= size[1] >> 1;
                    }
                }
                if (i >= n) {
                    that.stop();
                    that._fixTagPosition(tags);
                    dfop.endcallback(tags);
                }
            }
        },
        _fixTagPosition: function (tags) {
            var center = this.defaultOption.center;
            for (var i = 0, len = tags.length; i < len; i++) {
                tags[i].x += center[0];
                tags[i].y += center[1];
            }
        },
        stop: function () {
            if (this.defaultOption.timer) {
                clearInterval(this.defaultOption.timer);
                this.defaultOption.timer = null;
            }
            return this;
        },
        end: function (v) {
            if (v) {
                this.defaultOption.endcallback = v;
            }
            return this;
        },
        _init: function (option) {
            this.defaultOption = {};
            this._initProperty(option);
            this._initMethod(option);
            this._initCanvas();
            this._initData(option.data);
        },
        _initData: function (datas) {
            var that = this;
            var thatop = that.defaultOption;
            this.wordsdata = datas.map(function (d, i) {
                d.text = thatop.text.call(that, d, i);
                d.font = thatop.font.call(that, d, i);
                d.style = thatop.fontStyle.call(that, d, i);
                d.weight = thatop.fontWeight.call(that, d, i);
                d.rotate = thatop.rotate.call(that, d, i);
                d.size = ~~thatop.fontSize.call(that, d, i);
                d.padding = thatop.padding.call(that, d, i);
                return d;
            }).sort(function (a, b) {
                return b.value - a.value;
            });
        },
        _initMethod: function (option) {
            var dfop = this.defaultOption;
            dfop.text = option.text ? functor(option.text) : cloudText;
            dfop.font = option.font ? functor(option.font) : cloudFont;
            dfop.fontSize = option.fontSize ? functor(option.fontSize) : cloudFontSize;
            dfop.fontStyle = option.fontStyle ? functor(option.fontStyle) : cloudFontNormal;
            dfop.fontWeight = option.fontWeight ? functor(option.fontWeight) : cloudFontNormal;
            dfop.rotate = option.rotate ? newCloudRotate(option.rotate) : cloudRotate;
            dfop.padding = option.padding ? functor(option.padding) : cloudPadding;
            dfop.center = option.center;
            dfop.spiral = archimedeanSpiral;
            dfop.endcallback = function () {
            };
            dfop.rectangularSpiral = rectangularSpiral;
            dfop.archimedeanSpiral = archimedeanSpiral;
            function cloudText(d) {
                return d.name;
            }
            function cloudFont() {
                return 'sans-serif';
            }
            function cloudFontNormal() {
                return 'normal';
            }
            function cloudFontSize(d) {
                return d.value;
            }
            function cloudRotate() {
                return 0;
            }
            function newCloudRotate(rotate) {
                return function () {
                    return rotate[Math.round(Math.random() * (rotate.length - 1))];
                };
            }
            function cloudPadding() {
                return 0;
            }
            function archimedeanSpiral(size) {
                var e = size[0] / size[1];
                return function (t) {
                    return [
                        e * (t *= 0.1) * Math.cos(t),
                        t * Math.sin(t)
                    ];
                };
            }
            function rectangularSpiral(size) {
                var dy = 4;
                var dx = dy * size[0] / size[1];
                var x = 0;
                var y = 0;
                return function (t) {
                    var sign = t < 0 ? -1 : 1;
                    switch (Math.sqrt(1 + 4 * sign * t) - sign & 3) {
                    case 0:
                        x += dx;
                        break;
                    case 1:
                        y += dy;
                        break;
                    case 2:
                        x -= dx;
                        break;
                    default:
                        y -= dy;
                        break;
                    }
                    return [
                        x,
                        y
                    ];
                };
            }
            function functor(v) {
                return typeof v === 'function' ? v : function () {
                    return v;
                };
            }
        },
        _initProperty: function (option) {
            var dfop = this.defaultOption;
            dfop.size = option.size || [
                256,
                256
            ];
            dfop.wordletype = option.wordletype;
            dfop.words = option.words || [];
            dfop.timeInterval = Infinity;
            dfop.timer = null;
            dfop.spirals = {
                archimedean: dfop.archimedeanSpiral,
                rectangular: dfop.rectangularSpiral
            };
            zrUtil.merge(dfop, {
                size: [
                    256,
                    256
                ],
                wordletype: {
                    type: 'RECT',
                    areaPresent: 0.058,
                    autoSizeCal: {
                        enable: true,
                        minSize: 12
                    }
                }
            });
        },
        _initCanvas: function () {
            var cloudRadians = Math.PI / 180;
            var cw = 1 << 11 >> 5;
            var ch = 1 << 11;
            var canvas;
            var ratio = 1;
            if (typeof document !== 'undefined') {
                canvas = document.createElement('canvas');
                canvas.width = 1;
                canvas.height = 1;
                ratio = Math.sqrt(canvas.getContext('2d').getImageData(0, 0, 1, 1).data.length >> 2);
                canvas.width = (cw << 5) / ratio;
                canvas.height = ch / ratio;
            } else {
                canvas = new Canvas(cw << 5, ch);
            }
            var c = canvas.getContext('2d');
            c.fillStyle = c.strokeStyle = 'red';
            c.textAlign = 'center';
            this.defaultOption.c = c;
            this.defaultOption.cw = cw;
            this.defaultOption.ch = ch;
            this.defaultOption.ratio = ratio;
            this.defaultOption.cloudRadians = cloudRadians;
        },
        _cloudSprite: function (d, data, di) {
            if (d.sprite) {
                return;
            }
            var cw = this.defaultOption.cw;
            var ch = this.defaultOption.ch;
            var c = this.defaultOption.c;
            var ratio = this.defaultOption.ratio;
            var cloudRadians = this.defaultOption.cloudRadians;
            c.clearRect(0, 0, (cw << 5) / ratio, ch / ratio);
            var x = 0;
            var y = 0;
            var maxh = 0;
            var n = data.length;
            --di;
            while (++di < n) {
                d = data[di];
                c.save();
                c.font = d.style + ' ' + d.weight + ' ' + ~~((d.size + 1) / ratio) + 'px ' + d.font;
                var w = c.measureText(d.text + 'm').width * ratio;
                var h = d.size << 1;
                if (d.rotate) {
                    var sr = Math.sin(d.rotate * cloudRadians);
                    var cr = Math.cos(d.rotate * cloudRadians);
                    var wcr = w * cr;
                    var wsr = w * sr;
                    var hcr = h * cr;
                    var hsr = h * sr;
                    w = Math.max(Math.abs(wcr + hsr), Math.abs(wcr - hsr)) + 31 >> 5 << 5;
                    h = ~~Math.max(Math.abs(wsr + hcr), Math.abs(wsr - hcr));
                } else {
                    w = w + 31 >> 5 << 5;
                }
                if (h > maxh) {
                    maxh = h;
                }
                if (x + w >= cw << 5) {
                    x = 0;
                    y += maxh;
                    maxh = 0;
                }
                if (y + h >= ch) {
                    break;
                }
                c.translate((x + (w >> 1)) / ratio, (y + (h >> 1)) / ratio);
                if (d.rotate) {
                    c.rotate(d.rotate * cloudRadians);
                }
                c.fillText(d.text, 0, 0);
                if (d.padding) {
                    c.lineWidth = 2 * d.padding;
                    c.strokeText(d.text, 0, 0);
                }
                c.restore();
                d.width = w;
                d.height = h;
                d.xoff = x;
                d.yoff = y;
                d.x1 = w >> 1;
                d.y1 = h >> 1;
                d.x0 = -d.x1;
                d.y0 = -d.y1;
                d.hasText = true;
                x += w;
            }
            var pixels = c.getImageData(0, 0, (cw << 5) / ratio, ch / ratio).data;
            var sprite = [];
            while (--di >= 0) {
                d = data[di];
                if (!d.hasText) {
                    continue;
                }
                var w = d.width;
                var w32 = w >> 5;
                var h = d.y1 - d.y0;
                for (var i = 0; i < h * w32; i++) {
                    sprite[i] = 0;
                }
                x = d.xoff;
                if (x == null) {
                    return;
                }
                y = d.yoff;
                var seen = 0;
                var seenRow = -1;
                for (var j = 0; j < h; j++) {
                    for (var i = 0; i < w; i++) {
                        var k = w32 * j + (i >> 5);
                        var m = pixels[(y + j) * (cw << 5) + (x + i) << 2] ? 1 << 31 - i % 32 : 0;
                        sprite[k] |= m;
                        seen |= m;
                    }
                    if (seen) {
                        seenRow = j;
                    } else {
                        d.y0++;
                        h--;
                        j--;
                        y++;
                    }
                }
                d.y1 = d.y0 + seenRow;
                d.sprite = sprite.slice(0, (d.y1 - d.y0) * w32);
            }
        },
        _place: function (board, tag, maxBounds) {
            var size = this.defaultOption.size;
            var perimeter = [
                {
                    x: 0,
                    y: 0
                },
                {
                    x: size[0],
                    y: size[1]
                }
            ];
            var startX = tag.x;
            var startY = tag.y;
            var maxDelta = Math.sqrt(size[0] * size[0] + size[1] * size[1]);
            var s = this.defaultOption.spiral(size);
            var dt = Math.random() < 0.5 ? 1 : -1;
            var t = -dt;
            var dxdy;
            var dx;
            var dy;
            while (dxdy = s(t += dt)) {
                dx = ~~dxdy[0];
                dy = ~~dxdy[1];
                if (Math.min(dx, dy) > maxDelta) {
                    break;
                }
                tag.x = startX + dx;
                tag.y = startY + dy;
                if (tag.x + tag.x0 < 0 || tag.y + tag.y0 < 0 || tag.x + tag.x1 > size[0] || tag.y + tag.y1 > size[1]) {
                    continue;
                }
                if (!cloudCollide(tag, board, size[0])) {
                    if (collideRects(tag, maxBounds)) {
                        var sprite = tag.sprite;
                        var w = tag.width >> 5;
                        var sw = size[0] >> 5;
                        var lx = tag.x - (w << 4);
                        var sx = lx & 127;
                        var msx = 32 - sx;
                        var h = tag.y1 - tag.y0;
                        var x = (tag.y + tag.y0) * sw + (lx >> 5);
                        var last;
                        for (var j = 0; j < h; j++) {
                            last = 0;
                            for (var i = 0; i <= w; i++) {
                                board[x + i] |= last << msx | (i < w ? (last = sprite[j * w + i]) >>> sx : 0);
                            }
                            x += sw;
                        }
                        delete tag.sprite;
                        return true;
                    }
                }
            }
            return false;
            function cloudCollide(tag, board, sw) {
                sw >>= 5;
                var sprite = tag.sprite;
                var w = tag.width >> 5;
                var lx = tag.x - (w << 4);
                var sx = lx & 127;
                var msx = 32 - sx;
                var h = tag.y1 - tag.y0;
                var x = (tag.y + tag.y0) * sw + (lx >> 5);
                var last;
                for (var j = 0; j < h; j++) {
                    last = 0;
                    for (var i = 0; i <= w; i++) {
                        if ((last << msx | (i < w ? (last = sprite[j * w + i]) >>> sx : 0)) & board[x + i]) {
                            return true;
                        }
                    }
                    x += sw;
                }
                return false;
            }
            function collideRects(a, maxBounds) {
                return maxBounds.row[a.y] && maxBounds.cloumn[a.x] && a.x >= maxBounds.row[a.y].start && a.x <= maxBounds.row[a.y].end && a.y >= maxBounds.cloumn[a.x].start && a.y <= maxBounds.cloumn[a.x].end;
            }
        },
        _autoCalTextSize: function (data, shapeArea, maxwidth, maxheight, minSize) {
            var sizesum = sum(data, function (k) {
                return k.size;
            });
            var i = data.length;
            var maxareapre = 0.25;
            var minTextSize = minSize;
            var cw = this.defaultOption.cw;
            var ch = this.defaultOption.ch;
            var c = this.defaultOption.c;
            var ratio = this.defaultOption.ratio;
            var cloudRadians = this.defaultOption.cloudRadians;
            var d;
            var dpre;
            while (i--) {
                d = data[i];
                dpre = d.size / sizesum;
                if (maxareapre) {
                    d.areapre = dpre < maxareapre ? dpre : maxareapre;
                } else {
                    d.areapre = dpre;
                }
                d.area = shapeArea * d.areapre;
                d.totalarea = shapeArea;
                measureTextWitHitByarea(d);
            }
            function measureTextWitHitByarea(d) {
                c.clearRect(0, 0, (cw << 5) / ratio, ch / ratio);
                c.save();
                c.font = d.style + ' ' + d.weight + ' ' + ~~((d.size + 1) / ratio) + 'px ' + d.font;
                var w = c.measureText(d.text + 'm').width * ratio, h = d.size << 1;
                w = w + 31 >> 5 << 5;
                c.restore();
                d.aw = w;
                d.ah = h;
                var k, rw, rh;
                if (d.rotate) {
                    var sr = Math.sin(d.rotate * cloudRadians);
                    var cr = Math.cos(d.rotate * cloudRadians);
                    var wcr = w * cr;
                    var wsr = w * sr;
                    var hcr = h * cr;
                    var hsr = h * sr;
                    rw = Math.max(Math.abs(wcr + hsr), Math.abs(wcr - hsr)) + 31 >> 5 << 5;
                    rh = ~~Math.max(Math.abs(wsr + hcr), Math.abs(wsr - hcr));
                }
                if (d.size <= minTextSize || d.rotate && w * h <= d.area && rw <= maxwidth && rh <= maxheight || w * h <= d.area && w <= maxwidth && h <= maxheight) {
                    d.area = w * h;
                    return;
                }
                if (d.rotate && rw > maxwidth && rh > maxheight) {
                    k = Math.min(maxwidth / rw, maxheight / rh);
                } else if (w > maxwidth || h > maxheight) {
                    k = Math.min(maxwidth / w, maxheight / h);
                } else {
                    k = Math.sqrt(d.area / (d.aw * d.ah));
                }
                d.size = ~~(k * d.size);
                if (d.size < minSize) {
                    d.size = minSize;
                    return;
                }
                return measureTextWitHitByarea(d);
            }
            function sum(dts, callback) {
                var j = dts.length;
                var ressum = 0;
                while (j--) {
                    ressum += callback(dts[j]);
                }
                return ressum;
            }
        }
    };
    return CloudLayout;
});define('echarts/component/dataRange', [
    'require',
    './base',
    'zrender/shape/Text',
    'zrender/shape/Rectangle',
    '../util/shape/HandlePolygon',
    '../config',
    'zrender/tool/util',
    'zrender/tool/event',
    'zrender/tool/area',
    'zrender/tool/color',
    '../component'
], function (require) {
    var Base = require('./base');
    var TextShape = require('zrender/shape/Text');
    var RectangleShape = require('zrender/shape/Rectangle');
    var HandlePolygonShape = require('../util/shape/HandlePolygon');
    var ecConfig = require('../config');
    ecConfig.dataRange = {
        zlevel: 0,
        z: 4,
        show: true,
        orient: 'vertical',
        x: 'left',
        y: 'bottom',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: '#ccc',
        borderWidth: 0,
        padding: 5,
        itemGap: 10,
        itemWidth: 20,
        itemHeight: 14,
        precision: 0,
        splitNumber: 5,
        splitList: null,
        calculable: false,
        selectedMode: true,
        hoverLink: true,
        realtime: true,
        color: [
            '#006edd',
            '#e0ffff'
        ],
        textStyle: { color: '#333' }
    };
    var zrUtil = require('zrender/tool/util');
    var zrEvent = require('zrender/tool/event');
    var zrArea = require('zrender/tool/area');
    var zrColor = require('zrender/tool/color');
    function DataRange(ecTheme, messageCenter, zr, option, myChart) {
        Base.call(this, ecTheme, messageCenter, zr, option, myChart);
        var self = this;
        self._ondrift = function (dx, dy) {
            return self.__ondrift(this, dx, dy);
        };
        self._ondragend = function () {
            return self.__ondragend();
        };
        self._dataRangeSelected = function (param) {
            return self.__dataRangeSelected(param);
        };
        self._dispatchHoverLink = function (param) {
            return self.__dispatchHoverLink(param);
        };
        self._onhoverlink = function (params) {
            return self.__onhoverlink(params);
        };
        this._selectedMap = {};
        this._range = {};
        this.refresh(option);
        messageCenter.bind(ecConfig.EVENT.HOVER, this._onhoverlink);
    }
    DataRange.prototype = {
        type: ecConfig.COMPONENT_TYPE_DATARANGE,
        _textGap: 10,
        _buildShape: function () {
            this._itemGroupLocation = this._getItemGroupLocation();
            this._buildBackground();
            if (this._isContinuity()) {
                this._buildGradient();
            } else {
                this._buildItem();
            }
            if (this.dataRangeOption.show) {
                for (var i = 0, l = this.shapeList.length; i < l; i++) {
                    this.zr.addShape(this.shapeList[i]);
                }
            }
            this._syncShapeFromRange();
        },
        _buildItem: function () {
            var data = this._valueTextList;
            var dataLength = data.length;
            var itemName;
            var itemShape;
            var textShape;
            var font = this.getFont(this.dataRangeOption.textStyle);
            var lastX = this._itemGroupLocation.x;
            var lastY = this._itemGroupLocation.y;
            var itemWidth = this.dataRangeOption.itemWidth;
            var itemHeight = this.dataRangeOption.itemHeight;
            var itemGap = this.dataRangeOption.itemGap;
            var textHeight = zrArea.getTextHeight('国', font);
            var color;
            if (this.dataRangeOption.orient == 'vertical' && this.dataRangeOption.x == 'right') {
                lastX = this._itemGroupLocation.x + this._itemGroupLocation.width - itemWidth;
            }
            var needValueText = true;
            if (this.dataRangeOption.text) {
                needValueText = false;
                if (this.dataRangeOption.text[0]) {
                    textShape = this._getTextShape(lastX, lastY, this.dataRangeOption.text[0]);
                    if (this.dataRangeOption.orient == 'horizontal') {
                        lastX += zrArea.getTextWidth(this.dataRangeOption.text[0], font) + this._textGap;
                    } else {
                        lastY += textHeight + this._textGap;
                        textShape.style.y += textHeight / 2 + this._textGap;
                        textShape.style.textBaseline = 'bottom';
                    }
                    this.shapeList.push(new TextShape(textShape));
                }
            }
            for (var i = 0; i < dataLength; i++) {
                itemName = data[i];
                color = this.getColorByIndex(i);
                itemShape = this._getItemShape(lastX, lastY, itemWidth, itemHeight, this._selectedMap[i] ? color : '#ccc');
                itemShape._idx = i;
                itemShape.onmousemove = this._dispatchHoverLink;
                if (this.dataRangeOption.selectedMode) {
                    itemShape.clickable = true;
                    itemShape.onclick = this._dataRangeSelected;
                }
                this.shapeList.push(new RectangleShape(itemShape));
                if (needValueText) {
                    textShape = {
                        zlevel: this.getZlevelBase(),
                        z: this.getZBase(),
                        style: {
                            x: lastX + itemWidth + 5,
                            y: lastY,
                            color: this._selectedMap[i] ? this.dataRangeOption.textStyle.color : '#ccc',
                            text: data[i],
                            textFont: font,
                            textBaseline: 'top'
                        },
                        highlightStyle: { brushType: 'fill' }
                    };
                    if (this.dataRangeOption.orient == 'vertical' && this.dataRangeOption.x == 'right') {
                        textShape.style.x -= itemWidth + 10;
                        textShape.style.textAlign = 'right';
                    }
                    textShape._idx = i;
                    textShape.onmousemove = this._dispatchHoverLink;
                    if (this.dataRangeOption.selectedMode) {
                        textShape.clickable = true;
                        textShape.onclick = this._dataRangeSelected;
                    }
                    this.shapeList.push(new TextShape(textShape));
                }
                if (this.dataRangeOption.orient == 'horizontal') {
                    lastX += itemWidth + (needValueText ? 5 : 0) + (needValueText ? zrArea.getTextWidth(itemName, font) : 0) + itemGap;
                } else {
                    lastY += itemHeight + itemGap;
                }
            }
            if (!needValueText && this.dataRangeOption.text[1]) {
                if (this.dataRangeOption.orient == 'horizontal') {
                    lastX = lastX - itemGap + this._textGap;
                } else {
                    lastY = lastY - itemGap + this._textGap;
                }
                textShape = this._getTextShape(lastX, lastY, this.dataRangeOption.text[1]);
                if (this.dataRangeOption.orient != 'horizontal') {
                    textShape.style.y -= 5;
                    textShape.style.textBaseline = 'top';
                }
                this.shapeList.push(new TextShape(textShape));
            }
        },
        _buildGradient: function () {
            var itemShape;
            var textShape;
            var font = this.getFont(this.dataRangeOption.textStyle);
            var lastX = this._itemGroupLocation.x;
            var lastY = this._itemGroupLocation.y;
            var itemWidth = this.dataRangeOption.itemWidth;
            var itemHeight = this.dataRangeOption.itemHeight;
            var textHeight = zrArea.getTextHeight('国', font);
            var mSize = 10;
            var needValueText = true;
            if (this.dataRangeOption.text) {
                needValueText = false;
                if (this.dataRangeOption.text[0]) {
                    textShape = this._getTextShape(lastX, lastY, this.dataRangeOption.text[0]);
                    if (this.dataRangeOption.orient == 'horizontal') {
                        lastX += zrArea.getTextWidth(this.dataRangeOption.text[0], font) + this._textGap;
                    } else {
                        lastY += textHeight + this._textGap;
                        textShape.style.y += textHeight / 2 + this._textGap;
                        textShape.style.textBaseline = 'bottom';
                    }
                    this.shapeList.push(new TextShape(textShape));
                }
            }
            var zrColor = require('zrender/tool/color');
            var per = 1 / (this.dataRangeOption.color.length - 1);
            var colorList = [];
            for (var i = 0, l = this.dataRangeOption.color.length; i < l; i++) {
                colorList.push([
                    i * per,
                    this.dataRangeOption.color[i]
                ]);
            }
            if (this.dataRangeOption.orient == 'horizontal') {
                itemShape = {
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    style: {
                        x: lastX,
                        y: lastY,
                        width: itemWidth * mSize,
                        height: itemHeight,
                        color: zrColor.getLinearGradient(lastX, lastY, lastX + itemWidth * mSize, lastY, colorList)
                    },
                    hoverable: false
                };
                lastX += itemWidth * mSize + this._textGap;
            } else {
                itemShape = {
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    style: {
                        x: lastX,
                        y: lastY,
                        width: itemWidth,
                        height: itemHeight * mSize,
                        color: zrColor.getLinearGradient(lastX, lastY, lastX, lastY + itemHeight * mSize, colorList)
                    },
                    hoverable: false
                };
                lastY += itemHeight * mSize + this._textGap;
            }
            this.shapeList.push(new RectangleShape(itemShape));
            this._calculableLocation = itemShape.style;
            if (this.dataRangeOption.calculable) {
                this._buildFiller();
                this._bulidMask();
                this._bulidHandle();
            }
            this._buildIndicator();
            if (!needValueText && this.dataRangeOption.text[1]) {
                textShape = this._getTextShape(lastX, lastY, this.dataRangeOption.text[1]);
                this.shapeList.push(new TextShape(textShape));
            }
        },
        _buildIndicator: function () {
            var x = this._calculableLocation.x;
            var y = this._calculableLocation.y;
            var width = this._calculableLocation.width;
            var height = this._calculableLocation.height;
            var size = 5;
            var pointList;
            var textPosition;
            if (this.dataRangeOption.orient == 'horizontal') {
                if (this.dataRangeOption.y != 'bottom') {
                    pointList = [
                        [
                            x,
                            y + height
                        ],
                        [
                            x - size,
                            y + height + size
                        ],
                        [
                            x + size,
                            y + height + size
                        ]
                    ];
                    textPosition = 'bottom';
                } else {
                    pointList = [
                        [
                            x,
                            y
                        ],
                        [
                            x - size,
                            y - size
                        ],
                        [
                            x + size,
                            y - size
                        ]
                    ];
                    textPosition = 'top';
                }
            } else {
                if (this.dataRangeOption.x != 'right') {
                    pointList = [
                        [
                            x + width,
                            y
                        ],
                        [
                            x + width + size,
                            y - size
                        ],
                        [
                            x + width + size,
                            y + size
                        ]
                    ];
                    textPosition = 'right';
                } else {
                    pointList = [
                        [
                            x,
                            y
                        ],
                        [
                            x - size,
                            y - size
                        ],
                        [
                            x - size,
                            y + size
                        ]
                    ];
                    textPosition = 'left';
                }
            }
            this._indicatorShape = {
                style: {
                    pointList: pointList,
                    color: '#fff',
                    __rect: {
                        x: Math.min(pointList[0][0], pointList[1][0]),
                        y: Math.min(pointList[0][1], pointList[1][1]),
                        width: size * (this.dataRangeOption.orient == 'horizontal' ? 2 : 1),
                        height: size * (this.dataRangeOption.orient == 'horizontal' ? 1 : 2)
                    }
                },
                highlightStyle: {
                    brushType: 'fill',
                    textPosition: textPosition,
                    textColor: this.dataRangeOption.textStyle.color
                },
                hoverable: false
            };
            this._indicatorShape = new HandlePolygonShape(this._indicatorShape);
        },
        _buildFiller: function () {
            this._fillerShape = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase() + 1,
                style: {
                    x: this._calculableLocation.x,
                    y: this._calculableLocation.y,
                    width: this._calculableLocation.width,
                    height: this._calculableLocation.height,
                    color: 'rgba(255,255,255,0)'
                },
                highlightStyle: {
                    strokeColor: 'rgba(255,255,255,0.5)',
                    lineWidth: 1
                },
                draggable: true,
                ondrift: this._ondrift,
                ondragend: this._ondragend,
                onmousemove: this._dispatchHoverLink,
                _type: 'filler'
            };
            this._fillerShape = new RectangleShape(this._fillerShape);
            this.shapeList.push(this._fillerShape);
        },
        _bulidHandle: function () {
            var x = this._calculableLocation.x;
            var y = this._calculableLocation.y;
            var width = this._calculableLocation.width;
            var height = this._calculableLocation.height;
            var font = this.getFont(this.dataRangeOption.textStyle);
            var textHeight = zrArea.getTextHeight('国', font);
            var textWidth = Math.max(zrArea.getTextWidth(this._textFormat(this.dataRangeOption.max), font), zrArea.getTextWidth(this._textFormat(this.dataRangeOption.min), font)) + 2;
            var pointListStart;
            var textXStart;
            var textYStart;
            var coverRectStart;
            var pointListEnd;
            var textXEnd;
            var textYEnd;
            var coverRectEnd;
            if (this.dataRangeOption.orient == 'horizontal') {
                if (this.dataRangeOption.y != 'bottom') {
                    pointListStart = [
                        [
                            x,
                            y
                        ],
                        [
                            x,
                            y + height + textHeight
                        ],
                        [
                            x - textHeight,
                            y + height + textHeight
                        ],
                        [
                            x - 1,
                            y + height
                        ],
                        [
                            x - 1,
                            y
                        ]
                    ];
                    textXStart = x - textWidth / 2 - textHeight;
                    textYStart = y + height + textHeight / 2 + 2;
                    coverRectStart = {
                        x: x - textWidth - textHeight,
                        y: y + height,
                        width: textWidth + textHeight,
                        height: textHeight
                    };
                    pointListEnd = [
                        [
                            x + width,
                            y
                        ],
                        [
                            x + width,
                            y + height + textHeight
                        ],
                        [
                            x + width + textHeight,
                            y + height + textHeight
                        ],
                        [
                            x + width + 1,
                            y + height
                        ],
                        [
                            x + width + 1,
                            y
                        ]
                    ];
                    textXEnd = x + width + textWidth / 2 + textHeight;
                    textYEnd = textYStart;
                    coverRectEnd = {
                        x: x + width,
                        y: y + height,
                        width: textWidth + textHeight,
                        height: textHeight
                    };
                } else {
                    pointListStart = [
                        [
                            x,
                            y + height
                        ],
                        [
                            x,
                            y - textHeight
                        ],
                        [
                            x - textHeight,
                            y - textHeight
                        ],
                        [
                            x - 1,
                            y
                        ],
                        [
                            x - 1,
                            y + height
                        ]
                    ];
                    textXStart = x - textWidth / 2 - textHeight;
                    textYStart = y - textHeight / 2 - 2;
                    coverRectStart = {
                        x: x - textWidth - textHeight,
                        y: y - textHeight,
                        width: textWidth + textHeight,
                        height: textHeight
                    };
                    pointListEnd = [
                        [
                            x + width,
                            y + height
                        ],
                        [
                            x + width,
                            y - textHeight
                        ],
                        [
                            x + width + textHeight,
                            y - textHeight
                        ],
                        [
                            x + width + 1,
                            y
                        ],
                        [
                            x + width + 1,
                            y + height
                        ]
                    ];
                    textXEnd = x + width + textWidth / 2 + textHeight;
                    textYEnd = textYStart;
                    coverRectEnd = {
                        x: x + width,
                        y: y - textHeight,
                        width: textWidth + textHeight,
                        height: textHeight
                    };
                }
            } else {
                textWidth += textHeight;
                if (this.dataRangeOption.x != 'right') {
                    pointListStart = [
                        [
                            x,
                            y
                        ],
                        [
                            x + width + textHeight,
                            y
                        ],
                        [
                            x + width + textHeight,
                            y - textHeight
                        ],
                        [
                            x + width,
                            y - 1
                        ],
                        [
                            x,
                            y - 1
                        ]
                    ];
                    textXStart = x + width + textWidth / 2 + textHeight / 2;
                    textYStart = y - textHeight / 2;
                    coverRectStart = {
                        x: x + width,
                        y: y - textHeight,
                        width: textWidth + textHeight,
                        height: textHeight
                    };
                    pointListEnd = [
                        [
                            x,
                            y + height
                        ],
                        [
                            x + width + textHeight,
                            y + height
                        ],
                        [
                            x + width + textHeight,
                            y + textHeight + height
                        ],
                        [
                            x + width,
                            y + 1 + height
                        ],
                        [
                            x,
                            y + height + 1
                        ]
                    ];
                    textXEnd = textXStart;
                    textYEnd = y + height + textHeight / 2;
                    coverRectEnd = {
                        x: x + width,
                        y: y + height,
                        width: textWidth + textHeight,
                        height: textHeight
                    };
                } else {
                    pointListStart = [
                        [
                            x + width,
                            y
                        ],
                        [
                            x - textHeight,
                            y
                        ],
                        [
                            x - textHeight,
                            y - textHeight
                        ],
                        [
                            x,
                            y - 1
                        ],
                        [
                            x + width,
                            y - 1
                        ]
                    ];
                    textXStart = x - textWidth / 2 - textHeight / 2;
                    textYStart = y - textHeight / 2;
                    coverRectStart = {
                        x: x - textWidth - textHeight,
                        y: y - textHeight,
                        width: textWidth + textHeight,
                        height: textHeight
                    };
                    pointListEnd = [
                        [
                            x + width,
                            y + height
                        ],
                        [
                            x - textHeight,
                            y + height
                        ],
                        [
                            x - textHeight,
                            y + textHeight + height
                        ],
                        [
                            x,
                            y + 1 + height
                        ],
                        [
                            x + width,
                            y + height + 1
                        ]
                    ];
                    textXEnd = textXStart;
                    textYEnd = y + height + textHeight / 2;
                    coverRectEnd = {
                        x: x - textWidth - textHeight,
                        y: y + height,
                        width: textWidth + textHeight,
                        height: textHeight
                    };
                }
            }
            this._startShape = {
                style: {
                    pointList: pointListStart,
                    text: this._textFormat(this.dataRangeOption.max),
                    textX: textXStart,
                    textY: textYStart,
                    textFont: font,
                    color: this.getColor(this.dataRangeOption.max),
                    rect: coverRectStart,
                    x: pointListStart[0][0],
                    y: pointListStart[0][1],
                    _x: pointListStart[0][0],
                    _y: pointListStart[0][1]
                }
            };
            this._startShape.highlightStyle = {
                strokeColor: this._startShape.style.color,
                lineWidth: 1
            };
            this._endShape = {
                style: {
                    pointList: pointListEnd,
                    text: this._textFormat(this.dataRangeOption.min),
                    textX: textXEnd,
                    textY: textYEnd,
                    textFont: font,
                    color: this.getColor(this.dataRangeOption.min),
                    rect: coverRectEnd,
                    x: pointListEnd[0][0],
                    y: pointListEnd[0][1],
                    _x: pointListEnd[0][0],
                    _y: pointListEnd[0][1]
                }
            };
            this._endShape.highlightStyle = {
                strokeColor: this._endShape.style.color,
                lineWidth: 1
            };
            this._startShape.zlevel = this._endShape.zlevel = this.getZlevelBase();
            this._startShape.z = this._endShape.z = this.getZBase() + 1;
            this._startShape.draggable = this._endShape.draggable = true;
            this._startShape.ondrift = this._endShape.ondrift = this._ondrift;
            this._startShape.ondragend = this._endShape.ondragend = this._ondragend;
            this._startShape.style.textColor = this._endShape.style.textColor = this.dataRangeOption.textStyle.color;
            this._startShape.style.textAlign = this._endShape.style.textAlign = 'center';
            this._startShape.style.textPosition = this._endShape.style.textPosition = 'specific';
            this._startShape.style.textBaseline = this._endShape.style.textBaseline = 'middle';
            this._startShape.style.width = this._endShape.style.width = 0;
            this._startShape.style.height = this._endShape.style.height = 0;
            this._startShape.style.textPosition = this._endShape.style.textPosition = 'specific';
            this._startShape = new HandlePolygonShape(this._startShape);
            this._endShape = new HandlePolygonShape(this._endShape);
            this.shapeList.push(this._startShape);
            this.shapeList.push(this._endShape);
        },
        _bulidMask: function () {
            var x = this._calculableLocation.x;
            var y = this._calculableLocation.y;
            var width = this._calculableLocation.width;
            var height = this._calculableLocation.height;
            this._startMask = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase() + 1,
                style: {
                    x: x,
                    y: y,
                    width: this.dataRangeOption.orient == 'horizontal' ? 0 : width,
                    height: this.dataRangeOption.orient == 'horizontal' ? height : 0,
                    color: '#ccc'
                },
                hoverable: false
            };
            this._endMask = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase() + 1,
                style: {
                    x: this.dataRangeOption.orient == 'horizontal' ? x + width : x,
                    y: this.dataRangeOption.orient == 'horizontal' ? y : y + height,
                    width: this.dataRangeOption.orient == 'horizontal' ? 0 : width,
                    height: this.dataRangeOption.orient == 'horizontal' ? height : 0,
                    color: '#ccc'
                },
                hoverable: false
            };
            this._startMask = new RectangleShape(this._startMask);
            this._endMask = new RectangleShape(this._endMask);
            this.shapeList.push(this._startMask);
            this.shapeList.push(this._endMask);
        },
        _buildBackground: function () {
            var padding = this.reformCssArray(this.dataRangeOption.padding);
            this.shapeList.push(new RectangleShape({
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                hoverable: false,
                style: {
                    x: this._itemGroupLocation.x - padding[3],
                    y: this._itemGroupLocation.y - padding[0],
                    width: this._itemGroupLocation.width + padding[3] + padding[1],
                    height: this._itemGroupLocation.height + padding[0] + padding[2],
                    brushType: this.dataRangeOption.borderWidth === 0 ? 'fill' : 'both',
                    color: this.dataRangeOption.backgroundColor,
                    strokeColor: this.dataRangeOption.borderColor,
                    lineWidth: this.dataRangeOption.borderWidth
                }
            }));
        },
        _getItemGroupLocation: function () {
            var data = this._valueTextList;
            var dataLength = data.length;
            var itemGap = this.dataRangeOption.itemGap;
            var itemWidth = this.dataRangeOption.itemWidth;
            var itemHeight = this.dataRangeOption.itemHeight;
            var totalWidth = 0;
            var totalHeight = 0;
            var font = this.getFont(this.dataRangeOption.textStyle);
            var textHeight = zrArea.getTextHeight('国', font);
            var mSize = 10;
            if (this.dataRangeOption.orient == 'horizontal') {
                if (this.dataRangeOption.text || this._isContinuity()) {
                    totalWidth = (this._isContinuity() ? itemWidth * mSize + itemGap : dataLength * (itemWidth + itemGap)) + (this.dataRangeOption.text && typeof this.dataRangeOption.text[0] != 'undefined' ? zrArea.getTextWidth(this.dataRangeOption.text[0], font) + this._textGap : 0) + (this.dataRangeOption.text && typeof this.dataRangeOption.text[1] != 'undefined' ? zrArea.getTextWidth(this.dataRangeOption.text[1], font) + this._textGap : 0);
                } else {
                    itemWidth += 5;
                    for (var i = 0; i < dataLength; i++) {
                        totalWidth += itemWidth + zrArea.getTextWidth(data[i], font) + itemGap;
                    }
                }
                totalWidth -= itemGap;
                totalHeight = Math.max(textHeight, itemHeight);
            } else {
                var maxWidth;
                if (this.dataRangeOption.text || this._isContinuity()) {
                    totalHeight = (this._isContinuity() ? itemHeight * mSize + itemGap : dataLength * (itemHeight + itemGap)) + (this.dataRangeOption.text && typeof this.dataRangeOption.text[0] != 'undefined' ? this._textGap + textHeight : 0) + (this.dataRangeOption.text && typeof this.dataRangeOption.text[1] != 'undefined' ? this._textGap + textHeight : 0);
                    maxWidth = Math.max(zrArea.getTextWidth(this.dataRangeOption.text && this.dataRangeOption.text[0] || '', font), zrArea.getTextWidth(this.dataRangeOption.text && this.dataRangeOption.text[1] || '', font));
                    totalWidth = Math.max(itemWidth, maxWidth);
                } else {
                    totalHeight = (itemHeight + itemGap) * dataLength;
                    itemWidth += 5;
                    maxWidth = 0;
                    for (var i = 0; i < dataLength; i++) {
                        maxWidth = Math.max(maxWidth, zrArea.getTextWidth(data[i], font));
                    }
                    totalWidth = itemWidth + maxWidth;
                }
                totalHeight -= itemGap;
            }
            var padding = this.reformCssArray(this.dataRangeOption.padding);
            var x;
            var zrWidth = this.zr.getWidth();
            switch (this.dataRangeOption.x) {
            case 'center':
                x = Math.floor((zrWidth - totalWidth) / 2);
                break;
            case 'left':
                x = padding[3] + this.dataRangeOption.borderWidth;
                break;
            case 'right':
                x = zrWidth - totalWidth - padding[1] - this.dataRangeOption.borderWidth;
                break;
            default:
                x = this.parsePercent(this.dataRangeOption.x, zrWidth);
                x = isNaN(x) ? 0 : x;
                break;
            }
            var y;
            var zrHeight = this.zr.getHeight();
            switch (this.dataRangeOption.y) {
            case 'top':
                y = padding[0] + this.dataRangeOption.borderWidth;
                break;
            case 'bottom':
                y = zrHeight - totalHeight - padding[2] - this.dataRangeOption.borderWidth;
                break;
            case 'center':
                y = Math.floor((zrHeight - totalHeight) / 2);
                break;
            default:
                y = this.parsePercent(this.dataRangeOption.y, zrHeight);
                y = isNaN(y) ? 0 : y;
                break;
            }
            if (this.dataRangeOption.calculable) {
                var handlerWidth = Math.max(zrArea.getTextWidth(this.dataRangeOption.max, font), zrArea.getTextWidth(this.dataRangeOption.min, font)) + textHeight;
                if (this.dataRangeOption.orient == 'horizontal') {
                    if (x < handlerWidth) {
                        x = handlerWidth;
                    }
                    if (x + totalWidth + handlerWidth > zrWidth) {
                        x -= handlerWidth;
                    }
                } else {
                    if (y < textHeight) {
                        y = textHeight;
                    }
                    if (y + totalHeight + textHeight > zrHeight) {
                        y -= textHeight;
                    }
                }
            }
            return {
                x: x,
                y: y,
                width: totalWidth,
                height: totalHeight
            };
        },
        _getTextShape: function (x, y, text) {
            return {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                style: {
                    x: this.dataRangeOption.orient == 'horizontal' ? x : this._itemGroupLocation.x + this._itemGroupLocation.width / 2,
                    y: this.dataRangeOption.orient == 'horizontal' ? this._itemGroupLocation.y + this._itemGroupLocation.height / 2 : y,
                    color: this.dataRangeOption.textStyle.color,
                    text: text,
                    textFont: this.getFont(this.dataRangeOption.textStyle),
                    textBaseline: this.dataRangeOption.orient == 'horizontal' ? 'middle' : 'top',
                    textAlign: this.dataRangeOption.orient == 'horizontal' ? 'left' : 'center'
                },
                hoverable: false
            };
        },
        _getItemShape: function (x, y, width, height, color) {
            return {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                style: {
                    x: x,
                    y: y + 1,
                    width: width,
                    height: height - 2,
                    color: color
                },
                highlightStyle: {
                    strokeColor: color,
                    lineWidth: 1
                }
            };
        },
        __ondrift: function (shape, dx, dy) {
            var x = this._calculableLocation.x;
            var y = this._calculableLocation.y;
            var width = this._calculableLocation.width;
            var height = this._calculableLocation.height;
            if (this.dataRangeOption.orient == 'horizontal') {
                if (shape.style.x + dx <= x) {
                    shape.style.x = x;
                } else if (shape.style.x + dx + shape.style.width >= x + width) {
                    shape.style.x = x + width - shape.style.width;
                } else {
                    shape.style.x += dx;
                }
            } else {
                if (shape.style.y + dy <= y) {
                    shape.style.y = y;
                } else if (shape.style.y + dy + shape.style.height >= y + height) {
                    shape.style.y = y + height - shape.style.height;
                } else {
                    shape.style.y += dy;
                }
            }
            if (shape._type == 'filler') {
                this._syncHandleShape();
            } else {
                this._syncFillerShape(shape);
            }
            if (this.dataRangeOption.realtime) {
                this._dispatchDataRange();
            }
            return true;
        },
        __ondragend: function () {
            this.isDragend = true;
        },
        ondragend: function (param, status) {
            if (!this.isDragend || !param.target) {
                return;
            }
            status.dragOut = true;
            status.dragIn = true;
            if (!this.dataRangeOption.realtime) {
                this._dispatchDataRange();
            }
            status.needRefresh = false;
            this.isDragend = false;
            return;
        },
        _syncShapeFromRange: function () {
            var range = this.dataRangeOption.range || {};
            var optRangeStart = range.start;
            var optRangeEnd = range.end;
            if (optRangeEnd < optRangeStart) {
                optRangeStart = [
                    optRangeEnd,
                    optRangeEnd = optRangeStart
                ][0];
            }
            this._range.end = optRangeStart != null ? optRangeStart : this._range.end != null ? this._range.end : 0;
            this._range.start = optRangeEnd != null ? optRangeEnd : this._range.start != null ? this._range.start : 100;
            if (this._range.start != 100 || this._range.end !== 0) {
                if (this.dataRangeOption.orient == 'horizontal') {
                    var width = this._fillerShape.style.width;
                    this._fillerShape.style.x += width * (100 - this._range.start) / 100;
                    this._fillerShape.style.width = width * (this._range.start - this._range.end) / 100;
                } else {
                    var height = this._fillerShape.style.height;
                    this._fillerShape.style.y += height * (100 - this._range.start) / 100;
                    this._fillerShape.style.height = height * (this._range.start - this._range.end) / 100;
                }
                this.zr.modShape(this._fillerShape.id);
                this._syncHandleShape();
            }
        },
        _syncHandleShape: function () {
            var x = this._calculableLocation.x;
            var y = this._calculableLocation.y;
            var width = this._calculableLocation.width;
            var height = this._calculableLocation.height;
            if (this.dataRangeOption.orient == 'horizontal') {
                this._startShape.style.x = this._fillerShape.style.x;
                this._startMask.style.width = this._startShape.style.x - x;
                this._endShape.style.x = this._fillerShape.style.x + this._fillerShape.style.width;
                this._endMask.style.x = this._endShape.style.x;
                this._endMask.style.width = x + width - this._endShape.style.x;
                this._range.start = Math.ceil(100 - (this._startShape.style.x - x) / width * 100);
                this._range.end = Math.floor(100 - (this._endShape.style.x - x) / width * 100);
            } else {
                this._startShape.style.y = this._fillerShape.style.y;
                this._startMask.style.height = this._startShape.style.y - y;
                this._endShape.style.y = this._fillerShape.style.y + this._fillerShape.style.height;
                this._endMask.style.y = this._endShape.style.y;
                this._endMask.style.height = y + height - this._endShape.style.y;
                this._range.start = Math.ceil(100 - (this._startShape.style.y - y) / height * 100);
                this._range.end = Math.floor(100 - (this._endShape.style.y - y) / height * 100);
            }
            this._syncShape();
        },
        _syncFillerShape: function (e) {
            var x = this._calculableLocation.x;
            var y = this._calculableLocation.y;
            var width = this._calculableLocation.width;
            var height = this._calculableLocation.height;
            var a;
            var b;
            if (this.dataRangeOption.orient == 'horizontal') {
                a = this._startShape.style.x;
                b = this._endShape.style.x;
                if (e.id == this._startShape.id && a >= b) {
                    b = a;
                    this._endShape.style.x = a;
                } else if (e.id == this._endShape.id && a >= b) {
                    a = b;
                    this._startShape.style.x = a;
                }
                this._fillerShape.style.x = a;
                this._fillerShape.style.width = b - a;
                this._startMask.style.width = a - x;
                this._endMask.style.x = b;
                this._endMask.style.width = x + width - b;
                this._range.start = Math.ceil(100 - (a - x) / width * 100);
                this._range.end = Math.floor(100 - (b - x) / width * 100);
            } else {
                a = this._startShape.style.y;
                b = this._endShape.style.y;
                if (e.id == this._startShape.id && a >= b) {
                    b = a;
                    this._endShape.style.y = a;
                } else if (e.id == this._endShape.id && a >= b) {
                    a = b;
                    this._startShape.style.y = a;
                }
                this._fillerShape.style.y = a;
                this._fillerShape.style.height = b - a;
                this._startMask.style.height = a - y;
                this._endMask.style.y = b;
                this._endMask.style.height = y + height - b;
                this._range.start = Math.ceil(100 - (a - y) / height * 100);
                this._range.end = Math.floor(100 - (b - y) / height * 100);
            }
            this._syncShape();
        },
        _syncShape: function () {
            this._startShape.position = [
                this._startShape.style.x - this._startShape.style._x,
                this._startShape.style.y - this._startShape.style._y
            ];
            this._startShape.style.text = this._textFormat(this._gap * this._range.start + this.dataRangeOption.min);
            this._startShape.style.color = this._startShape.highlightStyle.strokeColor = this.getColor(this._gap * this._range.start + this.dataRangeOption.min);
            this._endShape.position = [
                this._endShape.style.x - this._endShape.style._x,
                this._endShape.style.y - this._endShape.style._y
            ];
            this._endShape.style.text = this._textFormat(this._gap * this._range.end + this.dataRangeOption.min);
            this._endShape.style.color = this._endShape.highlightStyle.strokeColor = this.getColor(this._gap * this._range.end + this.dataRangeOption.min);
            this.zr.modShape(this._startShape.id);
            this.zr.modShape(this._endShape.id);
            this.zr.modShape(this._startMask.id);
            this.zr.modShape(this._endMask.id);
            this.zr.modShape(this._fillerShape.id);
            this.zr.refreshNextFrame();
        },
        _dispatchDataRange: function () {
            this.messageCenter.dispatch(ecConfig.EVENT.DATA_RANGE, null, {
                range: {
                    start: this._range.end,
                    end: this._range.start
                }
            }, this.myChart);
        },
        __dataRangeSelected: function (param) {
            if (this.dataRangeOption.selectedMode === 'single') {
                for (var k in this._selectedMap) {
                    this._selectedMap[k] = false;
                }
            }
            var idx = param.target._idx;
            this._selectedMap[idx] = !this._selectedMap[idx];
            var valueMax;
            var valueMin;
            if (this._useCustomizedSplit()) {
                valueMax = this._splitList[idx].max;
                valueMin = this._splitList[idx].min;
            } else {
                valueMax = (this._colorList.length - idx) * this._gap + this.dataRangeOption.min;
                valueMin = valueMax - this._gap;
            }
            this.messageCenter.dispatch(ecConfig.EVENT.DATA_RANGE_SELECTED, param.event, {
                selected: this._selectedMap,
                target: idx,
                valueMax: valueMax,
                valueMin: valueMin
            }, this.myChart);
            this.messageCenter.dispatch(ecConfig.EVENT.REFRESH, null, null, this.myChart);
        },
        __dispatchHoverLink: function (param) {
            var valueMin;
            var valueMax;
            if (this.dataRangeOption.calculable) {
                var totalValue = this.dataRangeOption.max - this.dataRangeOption.min;
                var curValue;
                if (this.dataRangeOption.orient == 'horizontal') {
                    curValue = (1 - (zrEvent.getX(param.event) - this._calculableLocation.x) / this._calculableLocation.width) * totalValue;
                } else {
                    curValue = (1 - (zrEvent.getY(param.event) - this._calculableLocation.y) / this._calculableLocation.height) * totalValue;
                }
                valueMin = curValue - totalValue * 0.05;
                valueMax = curValue + totalValue * 0.05;
            } else if (this._useCustomizedSplit()) {
                var idx = param.target._idx;
                valueMax = this._splitList[idx].max;
                valueMin = this._splitList[idx].min;
            } else {
                var idx = param.target._idx;
                valueMax = (this._colorList.length - idx) * this._gap + this.dataRangeOption.min;
                valueMin = valueMax - this._gap;
            }
            this.messageCenter.dispatch(ecConfig.EVENT.DATA_RANGE_HOVERLINK, param.event, {
                valueMin: valueMin,
                valueMax: valueMax
            }, this.myChart);
        },
        __onhoverlink: function (param) {
            if (this.dataRangeOption.show && this.dataRangeOption.hoverLink && this._indicatorShape && param && param.seriesIndex != null && param.dataIndex != null) {
                var curValue = param.value;
                if (curValue === '' || isNaN(curValue)) {
                    return;
                }
                if (curValue < this.dataRangeOption.min) {
                    curValue = this.dataRangeOption.min;
                } else if (curValue > this.dataRangeOption.max) {
                    curValue = this.dataRangeOption.max;
                }
                if (this.dataRangeOption.orient == 'horizontal') {
                    this._indicatorShape.position = [
                        (this.dataRangeOption.max - curValue) / (this.dataRangeOption.max - this.dataRangeOption.min) * this._calculableLocation.width,
                        0
                    ];
                } else {
                    this._indicatorShape.position = [
                        0,
                        (this.dataRangeOption.max - curValue) / (this.dataRangeOption.max - this.dataRangeOption.min) * this._calculableLocation.height
                    ];
                }
                this._indicatorShape.style.text = this._textFormat(param.value);
                this._indicatorShape.style.color = this.getColor(curValue);
                this.zr.addHoverShape(this._indicatorShape);
            }
        },
        _textFormat: function (valueStart, valueEnd) {
            var dataRangeOption = this.dataRangeOption;
            if (valueStart !== -Number.MAX_VALUE) {
                valueStart = (+valueStart).toFixed(dataRangeOption.precision);
            }
            if (valueEnd != null && valueEnd !== Number.MAX_VALUE) {
                valueEnd = (+valueEnd).toFixed(dataRangeOption.precision);
            }
            if (dataRangeOption.formatter) {
                if (typeof dataRangeOption.formatter == 'string') {
                    return dataRangeOption.formatter.replace('{value}', valueStart === -Number.MAX_VALUE ? 'min' : valueStart).replace('{value2}', valueEnd === Number.MAX_VALUE ? 'max' : valueEnd);
                } else if (typeof dataRangeOption.formatter == 'function') {
                    return dataRangeOption.formatter.call(this.myChart, valueStart, valueEnd);
                }
            }
            if (valueEnd == null) {
                return valueStart;
            } else {
                if (valueStart === -Number.MAX_VALUE) {
                    return '< ' + valueEnd;
                } else if (valueEnd === Number.MAX_VALUE) {
                    return '> ' + valueStart;
                } else {
                    return valueStart + ' - ' + valueEnd;
                }
            }
        },
        _isContinuity: function () {
            var dataRangeOption = this.dataRangeOption;
            return !(dataRangeOption.splitList ? dataRangeOption.splitList.length > 0 : dataRangeOption.splitNumber > 0) || dataRangeOption.calculable;
        },
        _useCustomizedSplit: function () {
            var dataRangeOption = this.dataRangeOption;
            return dataRangeOption.splitList && dataRangeOption.splitList.length > 0;
        },
        _buildColorList: function (splitNumber) {
            this._colorList = zrColor.getGradientColors(this.dataRangeOption.color, Math.max((splitNumber - this.dataRangeOption.color.length) / (this.dataRangeOption.color.length - 1), 0) + 1);
            if (this._colorList.length > splitNumber) {
                var len = this._colorList.length;
                var newColorList = [this._colorList[0]];
                var step = len / (splitNumber - 1);
                for (var i = 1; i < splitNumber - 1; i++) {
                    newColorList.push(this._colorList[Math.floor(i * step)]);
                }
                newColorList.push(this._colorList[len - 1]);
                this._colorList = newColorList;
            }
            if (this._useCustomizedSplit()) {
                var splitList = this._splitList;
                for (var i = 0, len = splitList.length; i < len; i++) {
                    if (splitList[i].color) {
                        this._colorList[i] = splitList[i].color;
                    }
                }
            }
        },
        _buildGap: function (splitNumber) {
            if (!this._useCustomizedSplit()) {
                var precision = this.dataRangeOption.precision;
                this._gap = (this.dataRangeOption.max - this.dataRangeOption.min) / splitNumber;
                while (this._gap.toFixed(precision) - 0 != this._gap && precision < 5) {
                    precision++;
                }
                this.dataRangeOption.precision = precision;
                this._gap = ((this.dataRangeOption.max - this.dataRangeOption.min) / splitNumber).toFixed(precision) - 0;
            }
        },
        _buildDataList: function (splitNumber) {
            var valueTextList = this._valueTextList = [];
            var dataRangeOption = this.dataRangeOption;
            var useCustomizedSplit = this._useCustomizedSplit();
            for (var i = 0; i < splitNumber; i++) {
                this._selectedMap[i] = true;
                var text = '';
                if (useCustomizedSplit) {
                    var splitListItem = this._splitList[splitNumber - 1 - i];
                    if (splitListItem.label != null) {
                        text = splitListItem.label;
                    } else if (splitListItem.single != null) {
                        text = this._textFormat(splitListItem.single);
                    } else {
                        text = this._textFormat(splitListItem.min, splitListItem.max);
                    }
                } else {
                    text = this._textFormat(i * this._gap + dataRangeOption.min, (i + 1) * this._gap + dataRangeOption.min);
                }
                valueTextList.unshift(text);
            }
        },
        _buildSplitList: function () {
            if (!this._useCustomizedSplit()) {
                return;
            }
            var splitList = this.dataRangeOption.splitList;
            var splitRangeList = this._splitList = [];
            for (var i = 0, len = splitList.length; i < len; i++) {
                var splitListItem = splitList[i];
                if (!splitListItem || splitListItem.start == null && splitListItem.end == null) {
                    throw new Error('Empty item exists in splitList!');
                }
                var reformedItem = {
                    label: splitListItem.label,
                    color: splitListItem.color
                };
                reformedItem.min = splitListItem.start;
                reformedItem.max = splitListItem.end;
                if (reformedItem.min > reformedItem.max) {
                    reformedItem.min = [
                        reformedItem.max,
                        reformedItem.max = reformedItem.min
                    ][0];
                }
                if (reformedItem.min === reformedItem.max) {
                    reformedItem.single = reformedItem.max;
                }
                if (reformedItem.min == null) {
                    reformedItem.min = -Number.MAX_VALUE;
                }
                if (reformedItem.max == null) {
                    reformedItem.max = Number.MAX_VALUE;
                }
                splitRangeList.push(reformedItem);
            }
        },
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;
                this.option.dataRange = this.reformOption(this.option.dataRange);
                var dataRangeOption = this.dataRangeOption = this.option.dataRange;
                if (!this._useCustomizedSplit() && (dataRangeOption.min == null || dataRangeOption.max == null)) {
                    throw new Error('option.dataRange.min or option.dataRange.max has not been defined.');
                }
                if (!this.myChart.canvasSupported) {
                    dataRangeOption.realtime = false;
                }
                var splitNumber = this._isContinuity() ? 100 : this._useCustomizedSplit() ? dataRangeOption.splitList.length : dataRangeOption.splitNumber;
                this._buildSplitList();
                this._buildColorList(splitNumber);
                this._buildGap(splitNumber);
                this._buildDataList(splitNumber);
            }
            this.clear();
            this._buildShape();
        },
        getColor: function (value) {
            if (isNaN(value)) {
                return null;
            }
            var idx;
            if (!this._useCustomizedSplit()) {
                if (this.dataRangeOption.min == this.dataRangeOption.max) {
                    return this._colorList[0];
                }
                if (value < this.dataRangeOption.min) {
                    value = this.dataRangeOption.min;
                } else if (value > this.dataRangeOption.max) {
                    value = this.dataRangeOption.max;
                }
                if (this.dataRangeOption.calculable) {
                    if (value - (this._gap * this._range.start + this.dataRangeOption.min) > 0.00005 || value - (this._gap * this._range.end + this.dataRangeOption.min) < -0.00005) {
                        return null;
                    }
                }
                idx = this._colorList.length - Math.ceil((value - this.dataRangeOption.min) / (this.dataRangeOption.max - this.dataRangeOption.min) * this._colorList.length);
                if (idx == this._colorList.length) {
                    idx--;
                }
            } else {
                var splitRangeList = this._splitList;
                for (var i = 0, len = splitRangeList.length; i < len; i++) {
                    if (splitRangeList[i].min <= value && splitRangeList[i].max >= value) {
                        idx = i;
                        break;
                    }
                }
            }
            if (this._selectedMap[idx]) {
                return this._colorList[idx];
            } else {
                return null;
            }
        },
        getColorByIndex: function (idx) {
            if (idx >= this._colorList.length) {
                idx = this._colorList.length - 1;
            } else if (idx < 0) {
                idx = 0;
            }
            return this._colorList[idx];
        },
        onbeforDispose: function () {
            this.messageCenter.unbind(ecConfig.EVENT.HOVER, this._onhoverlink);
        }
    };
    zrUtil.inherits(DataRange, Base);
    require('../component').define('dataRange', DataRange);
    return DataRange;
});define('echarts/layout/WordCloudRectZero', ['require'], function (require) {
    function ZeroArray(option) {
        this.defaultOption = { type: 'RECT' };
        this._init(option);
    }
    ZeroArray.prototype = {
        RECT: '_calculateRect',
        _init: function (option) {
            this._initOption(option);
            this._initCanvas();
        },
        _initOption: function (option) {
            for (k in option) {
                this.defaultOption[k] = option[k];
            }
        },
        _initCanvas: function () {
            var canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            var ratio = Math.sqrt(canvas.getContext('2d').getImageData(0, 0, 1, 1).data.length >> 2);
            canvas.width = this.defaultOption.width;
            canvas.height = this.defaultOption.height;
            if (canvas.getContext) {
                var ctx = canvas.getContext('2d');
            }
            this.canvas = canvas;
            this.ctx = ctx;
            this.ratio = ratio;
        },
        calculate: function (callback, callbackObj) {
            var calType = this.defaultOption.type, calmethod = this[calType];
            this[calmethod].call(this, callback, callbackObj);
        },
        _calculateReturn: function (result, callback, callbackObj) {
            callback.call(callbackObj, result);
        },
        _calculateRect: function (callback, callbackObj) {
            var result = {}, width = this.defaultOption.width >> 5 << 5, height = this.defaultOption.height;
            result.initarr = this._rectZeroArray(width * height);
            result.area = width * height;
            result.maxHit = height;
            result.maxWit = width;
            result.imgboard = this._rectBoard(width, height);
            this._calculateReturn(result, callback, callbackObj);
        },
        _rectBoard: function (width, height) {
            var row = [];
            for (var i = 0; i < height; i++) {
                row.push({
                    y: i,
                    start: 0,
                    end: width
                });
            }
            var cloumn = [];
            for (var i = 0; i < width; i++) {
                cloumn.push({
                    x: i,
                    start: 0,
                    end: height
                });
            }
            return {
                row: row,
                cloumn: cloumn
            };
        },
        _rectZeroArray: function (num) {
            var a = [], n = num, i = -1;
            while (++i < n)
                a[i] = 0;
            return a;
        }
    };
    return ZeroArray;
});define('echarts/util/shape/HandlePolygon', [
    'require',
    'zrender/shape/Base',
    'zrender/shape/Polygon',
    'zrender/tool/util'
], function (require) {
    var Base = require('zrender/shape/Base');
    var PolygonShape = require('zrender/shape/Polygon');
    var zrUtil = require('zrender/tool/util');
    function HandlePolygon(options) {
        Base.call(this, options);
    }
    HandlePolygon.prototype = {
        type: 'handle-polygon',
        buildPath: function (ctx, style) {
            PolygonShape.prototype.buildPath(ctx, style);
        },
        isCover: function (x, y) {
            var originPos = this.transformCoordToLocal(x, y);
            x = originPos[0];
            y = originPos[1];
            var rect = this.style.rect;
            if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
                return true;
            } else {
                return false;
            }
        }
    };
    zrUtil.inherits(HandlePolygon, Base);
    return HandlePolygon;
});