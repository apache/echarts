/**
 * Symbol with ripple effect
 * @module echarts/chart/helper/EffectSymbol
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var symbolUtil = require('../../util/symbol');
    var graphic = require('../../util/graphic');
    var Symbol = require('./Symbol');
    var Group = graphic.Group;

    var EFFECT_RIPPLE_NUMBER = 3;

    function normalizeSymbolSize(symbolSize) {
        if (!zrUtil.isArray(symbolSize)) {
            symbolSize = [+symbolSize, +symbolSize];
        }
        return symbolSize;
    }
    /**
     * @constructor
     * @param {module:echarts/data/List} data
     * @param {number} idx
     * @extends {module:zrender/graphic/Group}
     */
    function EffectSymbol(data, idx) {
        Group.call(this);

        var symbol = new Symbol(data, idx);
        var rippleGroup = new Group();
        this.add(symbol);
        this.add(rippleGroup);

        rippleGroup.beforeUpdate = function () {
            this.attr(symbol.getScale());
        };
        this.updateData(data, idx);
    }

    var effectSymbolProto = EffectSymbol.prototype;

    effectSymbolProto.stopEffectAnimation = function () {
        this.childAt(1).removeAll();
    };

    effectSymbolProto.startEffectAnimation = function () {
        var symbolType = this._symbolType;
        var color = this._color;

        var rippleGroup = this.childAt(1);

        var randomOffset = -Math.random() * 5000;

        for (var i = 0; i < EFFECT_RIPPLE_NUMBER; i++) {
            var ripplePath = symbolUtil.createSymbol(
                symbolType, -0.5, -0.5, 1, 1, color
            );
            ripplePath.attr({
                style: {
                    stroke: null,
                    fill: color
                },
                z2: 99,
                scale: [1, 1]
            });

            var delay = -i / EFFECT_RIPPLE_NUMBER * 5000 + randomOffset;
            // TODO Configurable period
            ripplePath.animate('', true)
                .when(5000, {
                    scale: [3, 3]
                })
                .delay(delay)
                .start();
            ripplePath.animateStyle(true)
                .when(5000, {
                    opacity: 0
                })
                .delay(delay)
                .start();

            rippleGroup.add(ripplePath);
        }
    };

    /**
     * Highlight symbol
     */
    effectSymbolProto.highlight = function () {
        this.trigger('emphasis');
    };

    /**
     * Downplay symbol
     */
    effectSymbolProto.downplay = function () {
        this.trigger('normal');
    };

    /**
     * Update symbol properties
     * @param  {module:echarts/data/List} data
     * @param  {number} idx
     */
    effectSymbolProto.updateData = function (data, idx) {
        var seriesModel = data.hostModel;

        this.childAt(0).updateData(data, idx);

        var rippleGroup = this.childAt(1);
        var symbolType = data.getItemVisual(idx, 'symbol');
        var symbolSize = normalizeSymbolSize(data.getItemVisual(idx, 'symbolSize'));
        var color = data.getItemVisual(idx, 'color');

        rippleGroup.attr('scale', symbolSize);

        rippleGroup.traverse(function (ripplePath) {
            ripplePath.attr({
                fill: color
            });
        });

        this._symbolType = symbolType;
        this._color = color;

        var showEffectOn = seriesModel.get('showEffectOn');
        this.stopEffectAnimation();
        if (showEffectOn === 'render') {
            this.startEffectAnimation();
        }
        var symbol = this.childAt(0);
        function onEmphasis() {
            symbol.trigger('emphasis');
            if (showEffectOn !== 'render') {
                this.startEffectAnimation();
            }
        }
        function onNormal() {
            symbol.trigger('normal');
            if (showEffectOn !== 'render') {
                this.stopEffectAnimation();
            }
        }
        this.on('mouseover', onEmphasis, this)
            .on('mouseout', onNormal, this)
            .on('emphasis', onEmphasis, this)
            .on('normal', onNormal, this);
    };

    zrUtil.inherits(EffectSymbol, Group);

    return EffectSymbol;
});