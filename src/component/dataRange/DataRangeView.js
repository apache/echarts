define(function (require) {

    var echarts = require('../../echarts');
    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var modelUtil = require('../../util/model');
    var formatUtil = require('../../util/format');
    var layout = require('../../util/layout');

    return echarts.extendComponentView({

        type: 'dataRange',

        /**
         * @readOnly
         * @type {Object}
         */
        autoPositionValues: {left: 1, right: 1, top: 1, bottom: 1},

        init: function (ecModel, api) {
            /**
             * @readOnly
             * @type {module:echarts/model/Global}
             */
            this.ecModel = ecModel;

            /**
             * @readOnly
             * @type {module:echarts/ExtensionAPI}
             */
            this.api = api;

            /**
             * @readOnly
             * @type {module:echarts/component/dataRange/DataRangeModel}
             */
            this.dataRangeModel;

            /**
             * @private
             * @type {Object}
             */
            this._updatableShapes = {};
        },

        /**
         * @protected
         */
        render: function (dataRangeModel, ecModel, api, payload) {
            this.dataRangeModel = dataRangeModel;

            if (dataRangeModel.get('show') === false) {
                this.group.removeAll();
                return;
            }

            this.doRender.apply(this, arguments);
        },

        /**
         * @protected
         */
        renderBackground: function (group) {
            var dataRangeModel = this.dataRangeModel;
            var padding = formatUtil.normalizeCssArray(dataRangeModel.get('padding') || 0);
            var rect = group.getBoundingRect();

            group.add(new graphic.Rect({
                z2: -1, // Lay background rect on the lowest layer.
                silent: true,
                shape: {
                    x: rect.x - padding[3],
                    y: rect.y - padding[0],
                    width: rect.width + padding[3] + padding[1],
                    height: rect.height + padding[0] + padding[2]
                },
                style: {
                    fill: dataRangeModel.get('backgroundColor'),
                    stroke: dataRangeModel.get('borderColor'),
                    lineWidth: dataRangeModel.get('borderWidth')
                }
            }));
        },

        /**
         * @protected
         * @param {(number|Array)} targetValue
         * @param {string=} forceState Specify state, instead of using getValueState method.
         * @param {string=} visualType Specify visual type, defualt all available visualTypes.
         */
        getControllerVisual: function (targetValue, forceState, visualType) {
            var dataRangeModel = this.dataRangeModel;
            var targetIsArray = zrUtil.isArray(targetValue);

            // targetValue is array when caculate gradient color,
            // where forceState is required.
            if (targetIsArray && (!forceState || visualType !== 'color')) {
                throw new Error(targetValue);
            }

            var mappings = dataRangeModel.controllerVisuals[
                forceState || dataRangeModel.getValueState(targetValue)
            ];
            var defaultColor = dataRangeModel.get('contentColor');
            var visualObj = {
                symbol: dataRangeModel.get('itemSymbol'),
                color: targetIsArray
                    ? [{color: defaultColor, offset: 0}, {color: defaultColor, offset: 1}]
                    : defaultColor
            };

            function getter(key) {
                return visualObj[key];
            }

            function setter(key, value) {
                zrUtil.isObject(key)
                    ? zrUtil.extend(visualObj, key)
                    : (visualObj[key] = value);
            }

            zrUtil.each(mappings, function (visualMapping, type) {
                (!visualType || type === visualType)
                    && visualMapping
                    && visualMapping.applyVisual(
                        targetValue, getter, setter
                    );
            });

            return visualObj;
        },

        /**
         * @protected
         */
        getItemAlignByOrient: function (itemOrient, ecSize) {
            var modelOption = this.dataRangeModel.option;
            var itemAlign = modelOption.align;
            var orient = modelOption.orient;

            return itemOrient === 'horizontal'
                ? getAlign('x', ['left', 'right'])
                : getAlign('y', ['top', 'bottom']);

            function getAlign(dim, values) {
                var dim2 = dim + '2';
                var v = modelUtil.retrieveValue(modelOption[dim], modelOption[dim2], 0);
                if (!itemAlign || itemAlign === 'auto') {
                    itemAlign = (orient === 'horizontal' && orient === itemOrient)
                        ? 'right'
                        : has(dim, dim2, values[1])
                        ? values[0]
                        : has(dim, dim2, values[0])
                        ? values[1]
                        : (v > ecSize * 0.6 ? values[0] : values[1]);
                }

                return itemAlign;
            }

            function has(attr1, attr2, value) {
                return modelOption[attr1] === value || modelOption[attr2] === value;
            }
        },

        /**
         * @protected
         */
        positionGroup: function (group) {
            var model = this.dataRangeModel;
            var x = model.get('x');
            var y = model.get('y');
            var x2 = model.get('x2');
            var y2 = model.get('y2');
            var api = this.api;

            if (!x && !x2) {
                x = 'center';
            }
            if (!y && !y2) {
                y = 'bottom';
            }

            layout.positionGroup(
                group,
                {x: x, y: y, x2: x2, y2: y2},
                {width: api.getWidth(), height: api.getHeight()}
            );
        },

        /**
         * @protected
         * @abstract
         */
        doRender: zrUtil.noop

    });
});