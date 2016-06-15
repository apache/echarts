define(function(require) {
    'use strict';

    var featureManager = require('../featureManager');
    var zrUtil = require('zrender/core/util');

    function Brush(model, ecModel, api) {
        this.model = model;
        this.ecModel = ecModel;
        this.api = api;

        /**
         * @private
         * @type {string}
         */
        this._brushType;

        /**
         * @private
         * @type {string}
         */
        this._brushMode;
    }

    Brush.defaultOption = {
        show: true,
        type: ['rect', 'polygon', 'keep', 'clear'],
        icon: {
            // FIXME
            rect: 'M0,13.5h26.9 M13.5,26.9V0 M32.1,13.5H58V58H13.5 V32.1',
            // FIXME
            polygon: 'M0,13.5h26.9 M13.5,26.9V0 M32.1,13.5H58V58H13.5 V32.1',
            // FIXME
            keep: 'M3.8,33.4 M47,18.9h9.8V8.7 M56.3,20.1 C52.1,9,40.5,0.6,26.8,2.1C12.6,3.7,1.6,16.2,2.1,30.6 M13,41.1H3.1v10.2 M3.7,39.9c4.2,11.1,15.8,19.5,29.5,18 c14.2-1.6,25.2-14.1,24.7-28.5',
            // FIXME
            clear: 'M3.8,33.4 M47,18.9h9.8V8.7 M56.3,20.1 C52.1,9,40.5,0.6,26.8,2.1C12.6,3.7,1.6,16.2,2.1,30.6 M13,41.1H3.1v10.2 M3.7,39.9c4.2,11.1,15.8,19.5,29.5,18 c14.2-1.6,25.2-14.1,24.7-28.5'
        },
        title: {
            rect: '矩形选择',
            polygon: '圈选',
            keep: '保持选择',
            clear: '清除选择'
        }
    };

    var proto = Brush.prototype;

    proto.render = function (featureModel, ecModel, api) {
        var brushType;
        var brushMode;

        ecModel.eachComponent({mainType: 'brush'}, function (brushModel) {
            brushType = brushModel.brushType;
            brushMode = brushModel.brushOption.brushMode || 'single';
        });

        this._brushType = brushType;
        this._brushMode = brushMode;

        zrUtil.each(featureModel.get('type', true), function (type) {
            if (type !== 'clear' && type !== 'keep') {
                featureModel.setIconStatus(type, type === brushType ? 'emphasis' : 'normal');
            }
            if (type === 'keep') {
                featureModel.setIconStatus(type, brushMode === 'multiple' ? 'emphasis' : 'normal');
            }
        });
    };

    proto.getIcons = function () {
        var model = this.model;
        var availableIcons = model.get('icon', true);
        var icons = {};
        zrUtil.each(model.get('type', true), function (type) {
            if (availableIcons[type]) {
                icons[type] = availableIcons[type];
            }
        });
        return icons;
    };

    proto.onclick = function (ecModel, api, type) {
        var api = this.api;
        var brushType = this._brushType;
        var brushMode = this._brushMode;

        if (type === 'clear') {
            api.dispatchAction({
                type: 'brush',
                // Clear all brushRanges of all brush components.
                brushRanges: []
            });
        }
        else {
            api.dispatchAction({
                type: 'enableBrush',
                brushOption: {
                    brushType: type === 'keep'
                        ? brushType
                        : (brushType === type ? false : type),
                    brushMode: type === 'keep'
                        ? (brushMode === 'multiple' ? 'single' : 'multiple')
                        : brushMode
                }
            });
        }
    };

    featureManager.register('brush', Brush);

    return Brush;
});