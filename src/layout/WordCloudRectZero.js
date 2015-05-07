/**
 * @file    主要功能
 * @author  clmtulip(车丽美, clmtulip@gmail.com) liyong(liyong1239@163.com)
 */
define(function (require) {
    function ZeroArray(option) {
        this.defaultOption = {type: 'RECT'};
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
            var canvas = document.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;

            var ratio = Math.sqrt(canvas.getContext("2d").getImageData(0, 0, 1, 1).data.length >> 2);

            canvas.width = this.defaultOption.width;
            canvas.height = this.defaultOption.height;

            if (canvas.getContext) {
                var ctx = canvas.getContext('2d');
            }

            this.canvas = canvas;
            this.ctx = ctx;
            this.ratio = ratio;
        },

        /**执行计算， 并返回
         *
         * @param callback
         * 返回 {initarr, area, maxHit, maxWit} 给callback
         */
        calculate: function (callback, callbackObj) {
            var calType = this.defaultOption.type,
                calmethod = this[calType];

            this[calmethod].call(this, callback, callbackObj);
        },

        /**
         * callback 函数的 正确执行
         * @param result 计算后的结果，{initarr, area, maxHit, maxWit}
         * @param callback  计算成功之后的回调函数
         * @param callbackObj 回调函数的执行作用域
         * @private
         */
        _calculateReturn: function (result, callback, callbackObj) {
            callback.call(callbackObj, result);
        },

        _calculateRect: function (callback, callbackObj) {
            var result = {},
                width = this.defaultOption.width >> 5 << 5,
                height = this.defaultOption.height;

            // 初始化数组
            result.initarr = this._rectZeroArray(width * height);

            // 总面积
            result.area = width * height;

            // 最大高度
            result.maxHit = height;

            // 最大宽度
            result.maxWit = width;

            // 边界
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
                })
            }

            var cloumn = [];
            for (var i = 0; i < width; i++) {
                cloumn.push({
                    x: i,
                    start: 0,
                    end: height
                })
            }

            return {row: row, cloumn: cloumn};
        },

        _rectZeroArray: function (num) {
            var a = [],
                n = num,
                i = -1;
            while (++i < n) a[i] = 0;
            return a;
        }
    };

    return ZeroArray;
});