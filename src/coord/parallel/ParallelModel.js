define(function(require) {

    var zrUtil = require('zrender/core/util');
    var Component = require('../../model/Component');

    require('./AxisModel');

    Component.extend({

        type: 'parallel',

        dependencies: ['parallelAxis'],

        /**
         * @type {module:echarts/coord/parallel/Parallel}
         */
        coordinateSystem: null,

        /**
         * Each item like: 'dim0', 'dim1', 'dim2', ...
         * @type {Array.<string>}
         * @readOnly
         */
        dimensions: null,

        /**
         * Coresponding to dimensions.
         * @type {Array.<number>}
         * @readOnly
         */
        parallelAxisIndex: null,

        layoutMode: 'box',

        defaultOption: {
            zlevel: 0,
            z: 0,
            left: 80,
            top: 60,
            right: 80,
            bottom: 60,
            // width: {totalWidth} - left - right,
            // height: {totalHeight} - top - bottom,

            layout: 'horizontal',      // 'horizontal' or 'vertical'

            // FIXME
            // naming?
            axisExpandable: false,
            axisExpandCenter: null,
            axisExpandCount: 0,
            axisExpandWidth: 50,      // FIXME '10%' ?

            parallelAxisDefault: null
        },

        /**
         * @override
         */
        init: function () {
            Component.prototype.init.apply(this, arguments);

            this.mergeOption({});
        },

        /**
         * @override
         */
        mergeOption: function (newOption) {
            var thisOption = this.option;

            newOption && zrUtil.merge(thisOption, newOption, true);

            this._initDimensions();
        },

        /**
         * Whether series or axis is in this coordinate system.
         * @param {module:echarts/model/Series|module:echarts/coord/parallel/AxisModel} model
         * @param {module:echarts/model/Global} ecModel
         */
        contains: function (model, ecModel) {
            var parallelIndex = model.get('parallelIndex');
            return parallelIndex != null
                && ecModel.getComponent('parallel', parallelIndex) === this;
        },

        setAxisExpand: function (opt) {
            zrUtil.each(
                ['axisExpandable', 'axisExpandCenter', 'axisExpandCount', 'axisExpandWidth'],
                function (name) {
                    if (opt.hasOwnProperty(name)) {
                        this.option[name] = opt[name];
                    }
                },
                this
            );
        },

        /**
         * @private
         */
        _initDimensions: function () {
            var dimensions = this.dimensions = [];
            var parallelAxisIndex = this.parallelAxisIndex = [];

            var axisModels = zrUtil.filter(this.dependentModels.parallelAxis, function (axisModel) {
                // Can not use this.contains here, because
                // initialization has not been completed yet.
                return axisModel.get('parallelIndex') === this.componentIndex;
            });

            zrUtil.each(axisModels, function (axisModel) {
                dimensions.push('dim' + axisModel.get('dim'));
                parallelAxisIndex.push(axisModel.componentIndex);
            });
        }

    });

});