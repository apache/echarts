/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import * as echarts from '../../echarts';
import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import * as formatUtil from '../../util/format';
import * as layout from '../../util/layout';
import VisualMapping from '../../visual/VisualMapping';

export default echarts.extendComponentView({

    type: 'visualMap',

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
         * @type {module:echarts/component/visualMap/visualMapModel}
         */
        this.visualMapModel;
    },

    /**
     * @protected
     */
    render: function (visualMapModel, ecModel, api, payload) {
        this.visualMapModel = visualMapModel;

        if (visualMapModel.get('show') === false) {
            this.group.removeAll();
            return;
        }

        this.doRender.apply(this, arguments);
    },

    /**
     * @protected
     */
    renderBackground: function (group) {
        var visualMapModel = this.visualMapModel;
        var padding = formatUtil.normalizeCssArray(visualMapModel.get('padding') || 0);
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
                fill: visualMapModel.get('backgroundColor'),
                stroke: visualMapModel.get('borderColor'),
                lineWidth: visualMapModel.get('borderWidth')
            }
        }));
    },

    /**
     * @protected
     * @param {number} targetValue can be Infinity or -Infinity
     * @param {string=} visualCluster Only can be 'color' 'opacity' 'symbol' 'symbolSize'
     * @param {Object} [opts]
     * @param {string=} [opts.forceState] Specify state, instead of using getValueState method.
     * @param {string=} [opts.convertOpacityToAlpha=false] For color gradient in controller widget.
     * @return {*} Visual value.
     */
    getControllerVisual: function (targetValue, visualCluster, opts) {
        opts = opts || {};

        var forceState = opts.forceState;
        var visualMapModel = this.visualMapModel;
        var visualObj = {};

        // Default values.
        if (visualCluster === 'symbol') {
            visualObj.symbol = visualMapModel.get('itemSymbol');
        }
        if (visualCluster === 'color') {
            var defaultColor = visualMapModel.get('contentColor');
            visualObj.color = defaultColor;
        }

        function getter(key) {
            return visualObj[key];
        }

        function setter(key, value) {
            visualObj[key] = value;
        }

        var mappings = visualMapModel.controllerVisuals[
            forceState || visualMapModel.getValueState(targetValue)
        ];
        var visualTypes = VisualMapping.prepareVisualTypes(mappings);

        zrUtil.each(visualTypes, function (type) {
            var visualMapping = mappings[type];
            if (opts.convertOpacityToAlpha && type === 'opacity') {
                type = 'colorAlpha';
                visualMapping = mappings.__alphaForOpacity;
            }
            if (VisualMapping.dependsOn(type, visualCluster)) {
                visualMapping && visualMapping.applyVisual(
                    targetValue, getter, setter
                );
            }
        });

        return visualObj[visualCluster];
    },

    /**
     * @protected
     */
    positionGroup: function (group) {
        var model = this.visualMapModel;
        var api = this.api;

        layout.positionElement(
            group,
            model.getBoxLayoutParams(),
            {width: api.getWidth(), height: api.getHeight()}
        );
    },

    /**
     * @protected
     * @abstract
     */
    doRender: zrUtil.noop

});
