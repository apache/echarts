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
            rect: 'M7.3,34.7 M0.4,10V-0.2h9.8 M89.6,10V-0.2h-9.8 M0.4,60v10.2h9.8 M89.6,60v10.2h-9.8 M12.3,22.4V10.5h13.1 M33.6,10.5h7.8 M49.1,10.5h7.8 M77.5,22.4V10.5h-13 M12.3,31.1v8.2 M77.7,31.1v8.2 M12.3,47.6v11.9h13.1 M33.6,59.5h7.6 M49.1,59.5 h7.7 M77.5,47.6v11.9h-13',
            polygon: 'M55.2,34.9c1.7,0,3.1,1.4,3.1,3.1s-1.4,3.1-3.1,3.1 s-3.1-1.4-3.1-3.1S53.5,34.9,55.2,34.9z M50.4,51c1.7,0,3.1,1.4,3.1,3.1c0,1.7-1.4,3.1-3.1,3.1c-1.7,0-3.1-1.4-3.1-3.1 C47.3,52.4,48.7,51,50.4,51z M55.6,37.1l1.5-7.8 M60.1,13.5l1.6-8.7l-7.8,4 M59,19l-1,5.3 M24,16.1l6.4,4.9l6.4-3.3 M48.5,11.6 l-5.9,3.1 M19.1,12.8L9.7,5.1l1.1,7.7 M13.4,29.8l1,7.3l6.6,1.6 M11.6,18.4l1,6.1 M32.8,41.9 M26.6,40.4 M27.3,40.2l6.1,1.6 M49.9,52.1l-5.6-7.6l-4.9-1.2',
            keep: 'M4,10.5V1h10.3 M20.7,1h6.1 M33,1h6.1 M55.4,10.5V1H45.2 M4,17.3v6.6 M55.6,17.3v6.6 M4,30.5V40h10.3 M20.7,40 h6.1 M33,40h6.1 M55.4,30.5V40H45.2 M21,18.9h62.9v48.6H21V18.9z',
            clear: 'M22,14.7l30.9,31 M52.9,14.7L22,45.7 M4.7,16.8V4.2h13.1 M26,4.2h7.8 M41.6,4.2h7.8 M70.3,16.8V4.2H57.2 M4.7,25.9v8.6 M70.3,25.9v8.6 M4.7,43.2v12.6h13.1 M26,55.8h7.8 M41.6,55.8h7.8 M70.3,43.2v12.6H57.2'
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