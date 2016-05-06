/**
 * @module echarts/chart/helper/LineDraw
 */
define(function (require) {

    var graphic = require('../../util/graphic');
    var LineGroup = require('./Line');

    /**
     * @alias module:echarts/component/marker/LineDraw
     * @constructor
     */
    function LineDraw(ctor) {
        this._ctor = ctor || LineGroup;
        this.group = new graphic.Group();
    }

    var lineDrawProto = LineDraw.prototype;

    /**
     * @param {module:echarts/data/List} lineData
     */
    lineDrawProto.updateData = function (lineData) {

        var oldLineData = this._lineData;
        var group = this.group;
        var LineCtor = this._ctor;

        lineData.diff(oldLineData)
            .add(function (idx) {
                var lineGroup = new LineCtor(lineData, idx);

                lineData.setItemGraphicEl(idx, lineGroup);

                group.add(lineGroup);
            })
            .update(function (newIdx, oldIdx) {
                var lineGroup = oldLineData.getItemGraphicEl(oldIdx);
                lineGroup.updateData(lineData, newIdx);

                lineData.setItemGraphicEl(newIdx, lineGroup);

                group.add(lineGroup);
            })
            .remove(function (idx) {
                group.remove(oldLineData.getItemGraphicEl(idx));
            })
            .execute();

        this._lineData = lineData;
    };

    lineDrawProto.updateLayout = function () {
        var lineData = this._lineData;
        lineData.eachItemGraphicEl(function (el, idx) {
            el.updateLayout(lineData, idx);
        }, this);
    };

    lineDrawProto.remove = function () {
        this.group.removeAll();
    };

    return LineDraw;
});