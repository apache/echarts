define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var BrushController = require('../../helper/BrushController');
    var brushHelper = require('../../helper/brushHelper');
    var history = require('../../dataZoom/history');

    var each = zrUtil.each;

    // Use dataZoomSelect
    require('../../dataZoomSelect');

    // Spectial component id start with \0ec\0, see echarts/model/Global.js~hasInnerId
    var DATA_ZOOM_ID_BASE = '\0_ec_\0toolbox-dataZoom_';

    function DataZoom(model, ecModel, api) {

        /**
         * @private
         * @type {module:echarts/component/helper/BrushController}
         */
        (this._brushController = new BrushController(api.getZr()))
            .on('brush', zrUtil.bind(this._onBrush, this))
            .mount();

        /**
         * @private
         * @type {boolean}
         */
        this._isZoomActive;
    }

    DataZoom.defaultOption = {
        show: true,
        // Icon group
        icon: {
            zoom: 'M0,13.5h26.9 M13.5,26.9V0 M32.1,13.5H58V58H13.5 V32.1',
            back: 'M22,1.4L9.9,13.5l12.3,12.3 M10.3,13.5H54.9v44.6 H10.3v-26'
        },
        title: {
            zoom: '区域缩放',
            back: '区域缩放还原'
        }
    };

    var proto = DataZoom.prototype;

    proto.render = function (featureModel, ecModel, api, payload) {
        this.model = featureModel;
        this.ecModel = ecModel;
        this.api = api;

        updateZoomBtnStatus(featureModel, ecModel, this, payload);
        updateBackBtnStatus(featureModel, ecModel);
    };

    proto.onclick = function (ecModel, api, type) {
        handlers[type].call(this);
    };

    proto.remove = function (ecModel, api) {
        this._brushController.unmount();
    };

    proto.dispose = function (ecModel, api) {
        this._brushController.dispose();
    };

    /**
     * @private
     */
    var handlers = {

        zoom: function () {
            var nextActive = !this._isZoomActive;

            this.api.dispatchAction({
                type: 'takeGlobalCursor',
                key: 'dataZoomSelect',
                dataZoomSelectActive: nextActive
            });
        },

        back: function () {
            this._dispatchZoomAction(history.pop(this.ecModel));
        }
    };

    /**
     * @private
     */
    proto._onBrush = function (areas, opt) {
        if (!opt.isEnd || !areas.length) {
            return;
        }
        var snapshot = {};
        var ecModel = this.ecModel;

        this._brushController.updateCovers([]); // remove cover

        var coordInfoList = brushHelper.makeCoordInfoList(
            retrieveAxisSetting(this.model.option), ecModel
        );
        var rangesCoordInfoList = [];
        brushHelper.parseOutputRanges(areas, coordInfoList, ecModel, rangesCoordInfoList);

        var area = areas[0]; // dataZoom can not multiple area.
        var coordInfo = rangesCoordInfoList[0];
        var coordRange = area.coordRange;
        var brushType = area.brushType;

        if (coordInfo && coordRange) {
            if (brushType === 'rect') {
                setBatch('xAxis', coordRange[0], coordInfo);
                setBatch('yAxis', coordRange[1], coordInfo);
            }
            else {
                var axisNames = {lineX: 'xAxis', lineY: 'yAxis'};
                setBatch(axisNames[brushType], coordRange, coordInfo);
            }
        }

        history.push(ecModel, snapshot);

        this._dispatchZoomAction(snapshot);

        function setBatch(axisName, minMax, coordInfo) {
            var dataZoomModel = findDataZoom(axisName, coordInfo[axisName], ecModel);
            if (dataZoomModel) {
                snapshot[dataZoomModel.id] = {
                    dataZoomId: dataZoomModel.id,
                    startValue: minMax[0],
                    endValue: minMax[1]
                };
            }
        }

        function findDataZoom(axisName, axisModel, ecModel) {
            var dataZoomModel;
            ecModel.eachComponent(
                {mainType: 'dataZoom', subType: 'select'},
                function (dzModel, dataZoomIndex) {
                    var axisIndex = dzModel.get(axisName + 'Index');
                    if (axisIndex != null
                        && ecModel.getComponent(axisName, axisIndex) === axisModel
                    ) {
                        dataZoomModel = dzModel;
                    }
                }
            );
            return dataZoomModel;
        }
    };

    /**
     * @private
     */
    proto._dispatchZoomAction = function (snapshot) {
        var batch = [];

        // Convert from hash map to array.
        each(snapshot, function (batchItem, dataZoomId) {
            batch.push(zrUtil.clone(batchItem));
        });

        batch.length && this.api.dispatchAction({
            type: 'dataZoom',
            from: this.uid,
            batch: batch
        });
    };

    function retrieveAxisSetting(option) {
        var setting = {};
        // Compatible with previous setting: null => all axis, false => no axis.
        zrUtil.each(['xAxisIndex', 'yAxisIndex'], function (name) {
            setting[name] = option[name];
            setting[name] == null && (setting[name] = 'all');
            (setting[name] === false || setting[name] === 'none') && (setting[name] = []);
        });
        return setting;
    }

    function updateBackBtnStatus(featureModel, ecModel) {
        featureModel.setIconStatus(
            'back',
            history.count(ecModel) > 1 ? 'emphasis' : 'normal'
        );
    }

    function updateZoomBtnStatus(featureModel, ecModel, view, payload) {
        var zoomActive = view._isZoomActive;

        if (payload && payload.type === 'takeGlobalCursor') {
            zoomActive = payload.key === 'dataZoomSelect'
                ? payload.dataZoomSelectActive : false;
        }

        view._isZoomActive = zoomActive;

        featureModel.setIconStatus('zoom', zoomActive ? 'emphasis' : 'normal');

        var coordInfoList = brushHelper.makeCoordInfoList(
            retrieveAxisSetting(featureModel.option), ecModel
        );
        var brushType = (coordInfoList.xAxisHas && !coordInfoList.yAxisHas)
            ? 'lineX'
            : (!coordInfoList.xAxisHas && coordInfoList.yAxisHas)
            ? 'lineY'
            : 'rect';

        view._brushController
            .setPanels(brushHelper.makePanelOpts(coordInfoList))
            .enableBrush(
                zoomActive
                ? {
                    brushType: brushType,
                    brushStyle: { // FIXME user customized?
                        lineWidth: 0,
                        // stroke: '#333',
                        fill: 'rgba(0,0,0,0.2)'
                    }
                }
                : false
            );
    }


    require('../featureManager').register('dataZoom', DataZoom);


    // Create special dataZoom option for select
    require('../../../echarts').registerPreprocessor(function (option) {
        if (!option) {
            return;
        }

        var dataZoomOpts = option.dataZoom || (option.dataZoom = []);
        if (!zrUtil.isArray(dataZoomOpts)) {
            option.dataZoom = dataZoomOpts = [dataZoomOpts];
        }

        var toolboxOpt = option.toolbox;
        if (toolboxOpt) {
            // Assume there is only one toolbox
            if (zrUtil.isArray(toolboxOpt)) {
                toolboxOpt = toolboxOpt[0];
            }

            if (toolboxOpt && toolboxOpt.feature) {
                var dataZoomOpt = toolboxOpt.feature.dataZoom;
                addForAxis('xAxis', dataZoomOpt);
                addForAxis('yAxis', dataZoomOpt);
            }
        }

        function addForAxis(axisName, dataZoomOpt) {
            if (!dataZoomOpt) {
                return;
            }

            // Try not to modify model, because it is not merged yet.
            var axisIndicesName = axisName + 'Index';
            var givenAxisIndices = dataZoomOpt[axisIndicesName];
            if (givenAxisIndices != null
                && givenAxisIndices != 'all'
                && !zrUtil.isArray(givenAxisIndices)
            ) {
                givenAxisIndices = (givenAxisIndices === false || givenAxisIndices === 'none') ? [] : [givenAxisIndices];
            }

            forEachComponent(axisName, function (axisOpt, axisIndex) {
                if (givenAxisIndices != null
                    && givenAxisIndices != 'all'
                    && zrUtil.indexOf(givenAxisIndices, axisIndex) === -1
                ) {
                    return;
                }
                var newOpt = {
                    type: 'select',
                    $fromToolbox: true,
                    // Id for merge mapping.
                    id: DATA_ZOOM_ID_BASE + axisName + axisIndex
                };
                // FIXME
                // Only support one axis now.
                newOpt[axisIndicesName] = axisIndex;
                dataZoomOpts.push(newOpt);
            });
        }

        function forEachComponent(mainType, cb) {
            var opts = option[mainType];
            if (!zrUtil.isArray(opts)) {
                opts = opts ? [opts] : [];
            }
            each(opts, cb);
        }
    });

    return DataZoom;
});