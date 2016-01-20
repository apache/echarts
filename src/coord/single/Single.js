/**
 * Single coordinates system.
 */
define(function (require) {

    var SingleAxis = require('./SingleAxis');
    var axisHelper = require('../axisHelper');
    var layout = require('../../util/layout');

    /**
     * Create a single coordinates system.
     *
     * @param {module:echarts/coord/single/AxisModel} axisModel
     * @param {module:echarts/model/Global} ecModel
     * @param {module:echarts/ExtensionAPI} api
     */
    function Single(axisModel, ecModel, api) {

        /**
         * @type {string}
         * @readOnly
         */
        this.dimension = 'oneDim';

        /**
         * Add it just for draw tooltip.
         *
         * @type {Array.<string>}
         * @readOnly
         */
        this.dimensions = ['oneDim'];

        /**
         * @private
         * @type {module:echarts/coord/single/SingleAxis}.
         */
        this._axis = null;

        /**
         * @private
         * @type {module:zrender/core/BoundingRect}
         */
        this._rect;

        this._init(axisModel, ecModel, api);

    }

    Single.prototype = {

        type: 'single',

        constructor: Single,

        /**
         * Initialize single coordinate system.
         *
         * @param  {module:echarts/coord/single/AxisModel} axisModel
         * @param  {module:echarts/model/Global} ecModel
         * @param  {module:echarts/ExtensionAPI} api
         * @private
         */
        _init: function (axisModel, ecModel, api) {

            var dim = this.dimension;

            var axis = new SingleAxis(
                dim,
                axisHelper.createScaleByModel(axisModel),
                [0, 0],
                axisModel.get('type'),
                axisModel.position
            );

            var isCategory = axis.type === 'category';
            axis.onBand = isCategory && axisModel.get('boundaryGap');
            axis.inverse = axisModel.get('inverse');
            axis.orient = axisModel.get('orient');

            axisModel.axis = axis;
            axis.model = axisModel;
            this._axis = axis;

            this._updateAxisFromSeries(ecModel);
        },

        /**
         * Update the axis extent from series.
         *
         * @param  {module:echarts/model/Global} ecModel
         * @private
         */
        _updateAxisFromSeries: function (ecModel) {

            ecModel.eachSeries(function (seriesModel) {

                var data = seriesModel.getData();
                var dim = this.dimension;
                this._axis.scale.unionExtent(
                    data.getDataExtent(seriesModel.getDimensionsOnAxis(dim)));
            }, this);
        },

        /**
         * Resize the single coordinate system.
         *
         * @param  {module:echarts/coord/single/AxisModel} axisModel
         * @param  {module:echarts/ExtensionAPI} api
         */
        resize: function (axisModel, api) {
            this._rect = layout.getLayoutRect(
                {
                    left: axisModel.get('left'),
                    top: axisModel.get('top'),
                    right: axisModel.get('right'),
                    bottom: axisModel.get('bottom'),
                    width: axisModel.get('width'),
                    height: axisModel.get('height')
                },
                {
                    width: api.getWidth(),
                    height: api.getHeight()
                }
            );

            this._adjustAxis();
        },

        /**
         * @return {module:zrender/core/BoundingRect}
         */
        getRect: function () {
            return this._rect;
        },

        /**
         * @private
         */
        _adjustAxis: function () {

            var rect = this._rect;
            var axis = this._axis;

            var isHorizontal = axis.isHorizontal();
            var extent = isHorizontal ? [0, rect.width] : [0, rect.height];
            var idx =  axis.reverse ? 1 : 0;

            axis.setExtent(extent[idx], extent[1 - idx]);

            this._updateAxisTransform(axis, isHorizontal ? rect.x : rect.y);

        },

        /**
         * @param  {module:echarts/coord/single/SingleAxis} axis
         * @param  {number} coordBase
         */
        _updateAxisTransform: function (axis, coordBase) {

            var axisExtent = axis.getExtent();
            var extentSum = axisExtent[0] + axisExtent[1];
            var isHorizontal = axis.isHorizontal();

            axis.toGlobalCoord = isHorizontal ?
                function (coord) {
                    return coord + coordBase;
                } :
                function (coord) {
                    return extentSum - coord + coordBase;
                };

            axis.toLocalCoord = isHorizontal ?
                function (coord) {
                    return coord - coordBase;
                } :
                function (coord) {
                    return extentSum - coord + coordBase;
                };
        },

        /**
         * Get axis.
         *
         * @return {module:echarts/coord/single/SingleAxis}
         */
        getAxis: function () {
            return this._axis;
        },

        /**
         * Get axis, add it just for draw tooltip.
         *
         * @return {[type]} [description]
         */
        getBaseAxis: function () {
            return this._axis;
        },

        /**
         * If contain point.
         *
         * @param  {Array.<number>} point
         * @return {boolean}
         */
        containPoint: function (point) {
            var rect = this.getRect();
            var axis = this.getAxis();
            var orient = axis.orient;
            if (orient === 'horizontal') {
                return axis.contain(axis.toLocalCoord(point[0]))
                && (point[1] >= rect.y && point[1] <= (rect.y + rect.height));
            }
            else {
                return axis.contain(axis.toLocalCoord(point[1]))
                && (point[0] >= rect.y && point[0] <= (rect.y + rect.height));
            }
        },

        /**
         * @param {Array.<number>} point
         */
        pointToData: function (point) {
            var axis = this.getAxis();
            var orient = axis.orient;
            if (orient === 'horizontal') {
                return [
                    axis.coordToData(axis.toLocalCoord(point[0])),
                    point[1]
                ];
            }
            else {
                return [
                    axis.coordToData(axis.toLocalCoord(point[1])),
                    point[0]
                ];
            }
        },

        /**
         * Convert the series data to concrete point.
         *
         * @param  {*} value
         * @return {number}
         */
        dataToPoint: function (point) {
            var axis = this.getAxis();
            return [axis.toGlobalCoord(axis.dataToCoord(point[0])), point[1]];
        }
    };

    return Single;

});