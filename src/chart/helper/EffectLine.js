/**
 * @module echarts/chart/helper/EffectLine
 */
define(function (require) {

    var graphic = require('../../util/graphic');
    var Line = require('./Line');
    var zrUtil = require('zrender/core/util');
    var symbolUtil = require('../../util/symbol');

    var curveUtil = require('zrender/core/curve');

    /**
     * @constructor
     * @extends {module:zrender/graphic/Group}
     * @alias {module:echarts/chart/helper/Line}
     */
    function EffectLine(lineData, idx) {
        graphic.Group.call(this);

        var line = new Line(lineData, idx);
        this.add(line);

        this._updateEffectSymbol(lineData, idx);
    }

    var effectLineProto = EffectLine.prototype;

    function setAnimationPoints(symbol, points) {
        symbol.__p1 = points[0];
        symbol.__p2 = points[1];
        symbol.__cp1 = points[2] || [
            (points[0][0] + points[1][0]) / 2,
            (points[0][1] + points[1][1]) / 2
        ];
    }

    function updateSymbolPosition() {
        var p1 = this.__p1;
        var p2 = this.__p2;
        var cp1 = this.__cp1;
        var t = this.__t;
        var pos = this.position;
        var quadraticAt = curveUtil.quadraticAt;
        var quadraticDerivativeAt = curveUtil.quadraticDerivativeAt;
        pos[0] = quadraticAt(p1[0], cp1[0], p2[0], t);
        pos[1] = quadraticAt(p1[1], cp1[1], p2[1], t);

        // Tangent
        var tx = quadraticDerivativeAt(p1[0], cp1[0], p2[0], t);
        var ty = quadraticDerivativeAt(p1[1], cp1[1], p2[1], t);

        this.rotation = -Math.atan2(ty, tx) - Math.PI / 2;

        this.ignore = false;
    }

    effectLineProto._updateEffectSymbol = function (lineData, idx) {
        var itemModel = lineData.getItemModel(idx);
        var effectModel = itemModel.getModel('effect');
        var size = effectModel.get('symbolSize');
        var symbolType = effectModel.get('symbol');
        if (!zrUtil.isArray(size)) {
            size = [size, size];
        }
        var color = effectModel.get('color') || lineData.getItemVisual(idx, 'color');
        var symbol = this.childAt(1);
        var period = effectModel.get('period') * 1000;
        if (this._symbolType !== symbolType || period !== this._period) {
            symbol = symbolUtil.createSymbol(
                symbolType, -0.5, -0.5, 1, 1, color
            );
            symbol.ignore = true;
            symbol.z2 = 100;
            this._symbolType = symbolType;
            this._period = period;

            this.add(symbol);

            symbol.__t = 0;
            symbol.animate('', true)
                .when(period, {
                    __t: 1
                })
                .delay(idx / lineData.count() * period / 2)
                .during(zrUtil.bind(updateSymbolPosition, symbol))
                .start();
        }
        // Shadow color is same with color in default
        symbol.setStyle('shadowColor', color);
        symbol.setStyle(effectModel.getItemStyle(['color']));

        symbol.attr('scale', size);
        var points = lineData.getItemLayout(idx);
        setAnimationPoints(symbol, points);

        symbol.setColor(color);
        symbol.attr('scale', size);
    };

    effectLineProto.updateData = function (lineData, idx) {
        this.childAt(0).updateData(lineData, idx);
        this._updateEffectSymbol(lineData, idx);
    };

    effectLineProto.updateLayout = function (lineData, idx) {
        this.childAt(0).updateLayout(lineData, idx);
        var symbol = this.childAt(1);
        var points = lineData.getItemLayout(idx);
        setAnimationPoints(symbol, points);
    };

    zrUtil.inherits(EffectLine, graphic.Group);

    return EffectLine;
});