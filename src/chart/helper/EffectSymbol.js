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

    function updateRipplePath(rippleGroup, effectCfg) {
        rippleGroup.eachChild(function (ripplePath) {
            ripplePath.attr({
                z: effectCfg.z,
                zlevel: effectCfg.zlevel,
                style: {
                    stroke: effectCfg.brushType === 'stroke' ? effectCfg.color : null,
                    fill: effectCfg.brushType === 'fill' ? effectCfg.color : null
                }
            });
        });
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

    effectSymbolProto.startEffectAnimation = function (effectCfg) {
        var symbolType = effectCfg.symbolType;
        var color = effectCfg.color;
        var rippleGroup = this.childAt(1);

        for (var i = 0; i < EFFECT_RIPPLE_NUMBER; i++) {
            var ripplePath = symbolUtil.createSymbol(
                symbolType, -0.5, -0.5, 1, 1, color
            );
            ripplePath.attr({
                style: {
                    strokeNoScale: true
                },
                z2: 99,
                silent: true,
                scale: [1, 1]
            });

            var delay = -i / EFFECT_RIPPLE_NUMBER * effectCfg.period + effectCfg.effectOffset;
            // TODO Configurable effectCfg.period
            ripplePath.animate('', true)
                .when(effectCfg.period, {
                    scale: [effectCfg.rippleScale, effectCfg.rippleScale]
                })
                .delay(delay)
                .start();
            ripplePath.animateStyle(true)
                .when(effectCfg.period, {
                    opacity: 0
                })
                .delay(delay)
                .start();

            rippleGroup.add(ripplePath);
        }

        updateRipplePath(rippleGroup, effectCfg);
    };

    /**
     * Update effect symbol
     */
    effectSymbolProto.updateEffectAnimation = function (effectCfg) {
        var oldEffectCfg = this._effectCfg;
        var rippleGroup = this.childAt(1);

        // Must reinitialize effect if following configuration changed
        var DIFFICULT_PROPS = ['symbolType', 'period', 'rippleScale'];
        for (var i = 0; i < DIFFICULT_PROPS; i++) {
            var propName = DIFFICULT_PROPS[i];
            if (oldEffectCfg[propName] !== effectCfg[propName]) {
                this.stopEffectAnimation();
                this.startEffectAnimation(effectCfg);
                return;
            }
        }

        updateRipplePath(rippleGroup, effectCfg);
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

        var effectCfg = {};

        effectCfg.showEffectOn = seriesModel.get('showEffectOn');
        effectCfg.rippleScale = itemModel.get('rippleEffect.scale');
        effectCfg.brushType = itemModel.get('rippleEffect.brushType');
        effectCfg.period = itemModel.get('rippleEffect.period') * 1000;
        effectCfg.effectOffset = idx / data.count();
        effectCfg.z = itemModel.getShallow('z') || 0;
        effectCfg.zlevel = itemModel.getShallow('zlevel') || 0;
        effectCfg.symbolType = symbolType;
        effectCfg.color = color;

        this.off('mouseover').off('mouseout').off('emphasis').off('normal');

        if (effectCfg.showEffectOn === 'render') {
            this._effectCfg
                ? this.updateEffectAnimation(effectCfg)
                : this.startEffectAnimation(effectCfg);

            this._effectCfg = effectCfg;
        }
        else {
            // Not keep old effect config
            this._effectCfg = null;

            this.stopEffectAnimation();
            var symbol = this.childAt(0);
            var onEmphasis = function () {
                symbol.trigger('emphasis');
                if (effectCfg.showEffectOn !== 'render') {
                    this.startEffectAnimation(effectCfg);
                }
            };
            var onNormal = function () {
                symbol.trigger('normal');
                if (effectCfg.showEffectOn !== 'render') {
                    this.stopEffectAnimation();
                }
            };
            this.on('mouseover', onEmphasis, this)
                .on('mouseout', onNormal, this)
                .on('emphasis', onEmphasis, this)
                .on('normal', onNormal, this);
        }

        this._effectCfg = effectCfg;
    };

    effectSymbolProto.fadeOut = function (cb) {
        this.off('mouseover').off('mouseout').off('emphasis').off('normal');
        cb && cb();
    };

    zrUtil.inherits(EffectSymbol, Group);

    return EffectSymbol;
});