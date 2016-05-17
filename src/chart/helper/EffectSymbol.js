/**
 * Symbol with ripple effect
 * @module echarts/chart/helper/EffectSymbol
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var symbolUtil = require('../../util/symbol');
    var graphic = require('../../util/graphic');
    var numberUtil = require('../../util/number');
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

    effectSymbolProto.startEffectAnimation = function (
        period, brushType, rippleScale, effectOffset, z, zlevel
    ) {
        var symbolType = this._symbolType;
        var color = this._color;

        var rippleGroup = this.childAt(1);

        for (var i = 0; i < EFFECT_RIPPLE_NUMBER; i++) {
            var ripplePath = symbolUtil.createSymbol(
                symbolType, -0.5, -0.5, 1, 1, color
            );
            ripplePath.attr({
                style: {
                    stroke: brushType === 'stroke' ? color : null,
                    fill: brushType === 'fill' ? color : null,
                    strokeNoScale: true
                },
                z2: 99,
                silent: true,
                scale: [1, 1],
                z: z,
                zlevel: zlevel
            });

            var delay = -i / EFFECT_RIPPLE_NUMBER * period + effectOffset;
            // TODO Configurable period
            ripplePath.animate('', true)
                .when(period, {
                    scale: [rippleScale, rippleScale]
                })
                .delay(delay)
                .start();
            ripplePath.animateStyle(true)
                .when(period, {
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
        var itemModel = data.getItemModel(idx);
        var symbolType = data.getItemVisual(idx, 'symbol');
        var symbolSize = normalizeSymbolSize(data.getItemVisual(idx, 'symbolSize'));
        var color = data.getItemVisual(idx, 'color');

        rippleGroup.attr('scale', symbolSize);

        rippleGroup.traverse(function (ripplePath) {
            ripplePath.attr({
                fill: color
            });
        });

        var symbolOffset = itemModel.getShallow('symbolOffset');
        if (symbolOffset) {
            var pos = rippleGroup.position;
            pos[0] = numberUtil.parsePercent(symbolOffset[0], symbolSize[0]);
            pos[1] = numberUtil.parsePercent(symbolOffset[1], symbolSize[1]);
        }
        rippleGroup.rotation = (itemModel.getShallow('symbolRotate') || 0) * Math.PI / 180 || 0;

        this._symbolType = symbolType;
        this._color = color;

        var showEffectOn = seriesModel.get('showEffectOn');
        var rippleScale = itemModel.get('rippleEffect.scale');
        var brushType = itemModel.get('rippleEffect.brushType');
        var effectPeriod = itemModel.get('rippleEffect.period') * 1000;
        var effectOffset = idx / data.count();
        var z = itemModel.getShallow('z') || 0;
        var zlevel = itemModel.getShallow('zlevel') || 0;

        this.stopEffectAnimation();
        if (showEffectOn === 'render') {
            this.startEffectAnimation(
                effectPeriod, brushType, rippleScale, effectOffset, z, zlevel
            );
        }
        var symbol = this.childAt(0);
        function onEmphasis() {
            symbol.trigger('emphasis');
            if (showEffectOn !== 'render') {
                this.startEffectAnimation(
                    effectPeriod, brushType, rippleScale, effectOffset, z, zlevel
                );
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

    effectSymbolProto.fadeOut = function (cb) {
        this.off('mouseover').off('mouseout').off('emphasis').off('normal');
        cb && cb();
    };

    zrUtil.inherits(EffectSymbol, Group);

    return EffectSymbol;
});