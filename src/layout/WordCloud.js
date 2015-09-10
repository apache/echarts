/**
 * @author clmtulip(车丽美, clmtulip@gmail.com) liyong(liyong1239@163.com)
 */

// Modified from d3-cloud
/*
Copyright (c) 2013, Jason Davies.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.

  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

  * The name Jason Davies may not be used to endorse or promote products
    derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL JASON DAVIES BE LIABLE FOR ANY DIRECT, INDIRECT,
INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

define(function (require) {
    var ZeroArray = require('../layout/WordCloudRectZero');
    var zrUtil = require('zrender/tool/util');

    function CloudLayout(option) {
        this._init(option);
    }

    CloudLayout.prototype = {
        /**
         * 启动计算过程
         */
        start: function () {
            var board = null;
            var maxWit = 0;
            var maxHit = 0;
            var maxArea = 0;
            var i = -1;
            var tags = [];
            var maxBounds = null; /*图片的最大可用边框*/
            // 根据配置 初始化 字符云数组
            var data = this.wordsdata;
            var dfop = this.defaultOption;
            var wordletype = dfop.wordletype;
            var size = dfop.size;
            var that = this;

            //得到 ZeroArray 传递过来的 初始值 和面积 最大宽度等值
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
                //字体大小的确定，可配置，根据开关 确定是否要根据面积来定。。
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
                var start = +new Date;
                var n = data.length;
                var d;
                while (+new Date - start < dfop.timeInterval && ++i < n && dfop.timer) {
                    d = data[i];
                    // x y 的初始值
                    d.x = size[0] >> 1;
                    d.y = size[1] >> 1;
                    //得到每个 标签所占用的具体的像素点 用 0 1 标记， 每32位作为一个数字
                    that._cloudSprite(d, data, i);
                    //place 放置每个字符， 成功后 以 event 事件通知
                    if (d.hasText && that._place(board, d, maxBounds)) {

                        tags.push(d);
                        //                        event.word(d);
                        // Temporary hack
                        d.x -= size[0] >> 1;
                        d.y -= size[1] >> 1;
                    }

                }
                //全部放置完成 停止cloud，并触发 'end'事件
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

        /**
         * 停止计算过程
         */
        stop: function () {
            if (this.defaultOption.timer) {
                clearInterval(this.defaultOption.timer);
                this.defaultOption.timer = null;
            }
            return this;
        },

        /**
         * 计算结束后 执行V
         * @param v
         */
        end: function (v) {
            if (v) {
                this.defaultOption.endcallback = v;
            }
            return this;
        },

        /**
         * 初始化
         * @param option
         * @private
         */
        _init: function (option) {
            this.defaultOption = {};

            /*初始化属性*/
            this._initProperty(option);
            /*初始化方法*/
            this._initMethod(option);
            /*初始化 canvas 画板*/
            this._initCanvas();
            /*初始化数据*/
            this._initData(option.data);
        },

        _initData: function (datas) {
            var that = this;
            var thatop = that.defaultOption;
            this.wordsdata = datas.map(function (d, i) {
                d.dataIndex = i;

                d.text = thatop.text.call(that, d, i);

                d.font = thatop.font.call(that, d, i);
                d.style = thatop.fontStyle.call(that, d, i);
                d.weight = thatop.fontWeight.call(that, d, i);

                // 字体的旋转角度
                d.rotate = thatop.rotate.call(that, d, i);
                // 字体的大小 单位px
                d.size = ~~thatop.fontSize.call(that, d, i);
                // 字体间的间距
                d.padding = thatop.padding.call(that, d, i);

                return d;
            }).sort(function (a, b) {
                return b.value - a.value;
            });
        },

        /**
         * 默认函数的定义 及初始化过程
         * @private
         */
        _initMethod: function (option) {
            /*数据初始化中要用到的函数*/
            var dfop = this.defaultOption;
            dfop.text = (option.text) ? functor(option.text) : cloudText;
            dfop.font = (option.font) ? functor(option.font) : cloudFont;
            dfop.fontSize = (option.fontSize) ? functor(option.fontSize) : cloudFontSize;
            dfop.fontStyle = (option.fontStyle) ? functor(option.fontStyle) : cloudFontNormal;
            dfop.fontWeight = (option.fontWeight) ? functor(option.fontWeight) : cloudFontNormal;

            dfop.rotate = (option.rotate) ? newCloudRotate(option.rotate) : cloudRotate;

            dfop.padding = (option.padding) ? functor(option.padding) : cloudPadding;

            dfop.center = option.center;

            /*其它函数*/
            dfop.spiral = archimedeanSpiral;
            dfop.endcallback = function () {
            };
            dfop.rectangularSpiral = rectangularSpiral;
            dfop.archimedeanSpiral = archimedeanSpiral;

            function cloudText(d) {
                return d.name;
            }

            function cloudFont() {
                return "sans-serif";
            }

            function cloudFontNormal() {
                return "normal";
            }

            function cloudFontSize(d) {
                return d.value;
            }

            function cloudRotate() {
                return 0;
            }

            function newCloudRotate(rotate) {
                return function () {
                    return rotate[Math.round(Math.random() * (rotate.length - 1))]
                }
            }

            function cloudPadding() {
                return 0;
            }

            function archimedeanSpiral(size) {
                var e = size[0] / size[1];
                return function (t) {
                    return [
                            e * (t *= .1) * Math.cos(t),
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
                    // See triangular numbers: T_n = n * (n + 1) / 2.
                    switch ((Math.sqrt(1 + 4 * sign * t) - sign) & 3) {
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
                return typeof v === "function" ? v : function () {
                    return v;
                };
            }

        },

        _initProperty: function (option) {
            var dfop = this.defaultOption;
            //默认值
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
                    areaPresent: .058,
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

            if (typeof document !== "undefined") {
                canvas = document.createElement("canvas");
                canvas.width = 1;
                canvas.height = 1;
                ratio = Math.sqrt(
                    canvas.getContext("2d")
                        .getImageData(0, 0, 1, 1)
                        .data.length >> 2
                );
                canvas.width = (cw << 5) / ratio;
                canvas.height = ch / ratio;
            }
            else {
                // Attempt to use node-canvas.
                canvas = new Canvas(cw << 5, ch);
            }

            var c = canvas.getContext("2d");
            c.fillStyle = c.strokeStyle = "red";
            c.textAlign = "center";

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
                c.font = d.style + " " + d.weight + " " + ~~((d.size + 1) / ratio) + "px " + d.font;
                //得到 字体 实际的 宽和高
                var w = c.measureText(d.text + "m").width * ratio;
                var h = d.size << 1;
                //得到 d 所占用的具体的宽度 和高度  并取整
                if (d.rotate) {
                    var sr = Math.sin(d.rotate * cloudRadians);
                    var cr = Math.cos(d.rotate * cloudRadians);
                    var wcr = w * cr;
                    var wsr = w * sr;
                    var hcr = h * cr;
                    var hsr = h * sr;
                    w = (Math.max(Math.abs(wcr + hsr), Math.abs(wcr - hsr)) + 0x1f) >> 5 << 5;
                    h = ~~Math.max(Math.abs(wsr + hcr), Math.abs(wsr - hcr));
                }
                else {
                    w = (w + 0x1f) >> 5 << 5;
                }
                if (h > maxh) {
                    maxh = h;
                }
                //如果 字体 超出了 宽度 换更远的一行。。。
                if (x + w >= (cw << 5)) {
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
                // xoff  yoff 为 d在画板中的坐标位置
                d.xoff = x;
                d.yoff = y;
                d.x1 = w >> 1;
                d.y1 = h >> 1;
                d.x0 = -d.x1;
                d.y0 = -d.y1;
                d.hasText = true;
                x += w;
            }
            //得到 所在 区域的 像素值。。进而 确定 其 y的位置。。。
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
                // Zero the buffer
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
                        var m = pixels[((y + j) * (cw << 5) + (x + i)) << 2] ? 1 << (31 - (i % 32)) : 0;
                        sprite[k] |= m;
                        seen |= m;
                    }
                    if (seen) {
                        seenRow = j;
                    }
                    else {
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

            /*判断目前面积总值 是否超过了阈值*/
            /*判断目前该值是否能够放的下*/
            var size = this.defaultOption.size;
            var perimeter = [
                    {x: 0, y: 0},
                    {x: size[0], y: size[1]}
                ];
            var startX = tag.x;
            var startY = tag.y;
            var maxDelta = Math.sqrt(size[0] * size[0] + size[1] * size[1]);
            var s = this.defaultOption.spiral(size);
            var dt = Math.random() < .5 ? 1 : -1;
            var t = -dt;
            var dxdy;
            var dx;
            var dy;

            while (dxdy = s(t += dt)) {
                dx = ~~dxdy[0];
                dy = ~~dxdy[1];

                //当dx dy 都大于 maxDelta 即超出了 画板范围， 停止 放置。。 该值舍弃
                if (Math.min(dx, dy) > maxDelta) {
                    break;
                }

                tag.x = startX + dx;
                tag.y = startY + dy;

                if (tag.x + tag.x0 < 0 || tag.y + tag.y0 < 0 ||
                    tag.x + tag.x1 > size[0] || tag.y + tag.y1 > size[1]) {
                    continue;
                }
                // TODO only check for collisions within current bounds.
                if (!cloudCollide(tag, board, size[0])) {
                    if (collideRects(tag, maxBounds)) {
                        var sprite = tag.sprite;
                        var w = tag.width >> 5;
                        var sw = size[0] >> 5;
                        var lx = tag.x - (w << 4);
                        var sx = lx & 0x7f;
                        var msx = 32 - sx;
                        var h = tag.y1 - tag.y0;
                        var x = (tag.y + tag.y0) * sw + (lx >> 5);// 计算其在画板的 横坐标的位置
                        var last;

                        //当 该 字能够被正确放置时， 根据该字体的范围 更改标志位范围
                        for (var j = 0; j < h; j++) {
                            last = 0;
                            for (var i = 0; i <= w; i++) {
                                board[x + i] |= (last << msx) | (i < w ? (last = sprite[j * w + i]) >>> sx : 0);
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
                var sx = lx & 0x7f;
                var msx = 32 - sx;
                var h = tag.y1 - tag.y0;
                var x = (tag.y + tag.y0) * sw + (lx >> 5);
                var last;
                for (var j = 0; j < h; j++) {
                    last = 0;
                    for (var i = 0; i <= w; i++) {
                        if (((last << msx) | (i < w ? (last = sprite[j * w + i]) >>> sx : 0))
                            & board[x + i]) {
                            return true;
                        }
                    }
                    x += sw;
                }
                return false;
            }

            function collideRects(a, maxBounds) {
                return maxBounds.row[a.y] && maxBounds.cloumn[a.x]
                    && a.x >= maxBounds.row[a.y].start
                    && a.x <= maxBounds.row[a.y].end
                    && a.y >= maxBounds.cloumn[a.x].start
                    && a.y <= maxBounds.cloumn[a.x].end;
            }
        },

        _autoCalTextSize: function (data, shapeArea, maxwidth, maxheight, minSize) {
            //循环
            //面积 归一化
            //计算 每个字体的面积
            var sizesum = sum(data, function (k) {
                    return k.size;
                });
            var i = data.length;
            var maxareapre = .25; /*面积归一化后， 字体占总面积的最大百分比*/
            var minTextSize = minSize; /*字体所能缩放的最小大小。。如果字体面积 依旧无法满足上述约束， 字体将不会再缩小*/
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
                    d.areapre = (dpre < maxareapre) ? dpre : maxareapre;
                }
                else {
                    d.areapre = dpre;
                }

                d.area = shapeArea * d.areapre;
                d.totalarea = shapeArea;
                measureTextWitHitByarea(d);
            }

            //根据面积 计算字体的 size
            //根据 最大宽度 和最大高度 重新检测 字体的size， 不符合条件 重新计算，若字体大小已经是 最小size，则 取消计算。。。
            function measureTextWitHitByarea(d) {
                c.clearRect(0, 0, (cw << 5) / ratio, ch / ratio);
                c.save();
                c.font = d.style + " " + d.weight + " " + ~~((d.size + 1) / ratio) + "px " + d.font;

                //得到 字体 实际的 宽和高
                var w = c.measureText(d.text + "m").width * ratio,
                    h = d.size << 1;

                //得到 d 所占用的具体的宽度 和高度  并取整
                w = (w + 0x1f) >> 5 << 5; //给定了一个最小值 1 即不会存在 宽度为0的情况

                c.restore();
                d.aw = w;
                d.ah = h;


                var k, rw, rh;

                //如果 有旋转  测试 旋转后的 宽和高 是否 超过了 最大的大小
                if (d.rotate) {
                    var sr = Math.sin(d.rotate * cloudRadians);
                    var cr = Math.cos(d.rotate * cloudRadians);
                    var wcr = w * cr;
                    var wsr = w * sr;
                    var hcr = h * cr;
                    var hsr = h * sr;

                    rw = (Math.max(Math.abs(wcr + hsr), Math.abs(wcr - hsr)) + 0x1f) >> 5 << 5;
                    rh = ~~Math.max(Math.abs(wsr + hcr), Math.abs(wsr - hcr));
                }


                //满足条件 不用继续调整的
                // size 为 最小， 或者面积在允许范围内 且 宽和高也在允许范围内
                if (d.size < minTextSize) {
                    d.size = minTextSize;
                    return;
                }

                if ((d.rotate && w * h <= d.area && rw <= maxwidth && rh <= maxheight)
                    || (w * h <= d.area && w <= maxwidth && h <= maxheight)) {
                    d.area = w * h;
                    return;
                }

                //如果 超过了 最大宽度 或最大高度。。 继续计算
                if (d.rotate && rw > maxwidth && rh > maxheight) {// 有旋转时，超过了 最大宽度和最大高度
                    k = Math.min(maxwidth / rw, maxheight / rh);
                }
                else if (w > maxwidth || h > maxheight) {// 无旋转时，超过了 最大宽度和最大高度
                    k = Math.min(maxwidth / w, maxheight / h);
                }
                else {                                // 当前 面积 大于 规定的面积时
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
});