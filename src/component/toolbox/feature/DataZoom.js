define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var numberUtil = require('../../../util/number');
    var SelectController = require('../../helper/SelectController');
    var BoundingRect = require('zrender/core/BoundingRect');
    var Group = require('zrender/container/Group');
    var history = require('../../dataZoom/history');
    var interactionMutex = require('../../helper/interactionMutex');

    var each = zrUtil.each;
    var asc = numberUtil.asc;

    // Use dataZoomSelect
    require('../../dataZoomSelect');

    // Spectial component id start with \0ec\0, see echarts/model/Global.js~hasInnerId
    var DATA_ZOOM_ID_BASE = '\0_ec_\0toolbox-dataZoom_';

    function DataZoom(model) {
        this.model = model;

        /**
         * @private
         * @type {module:zrender/container/Group}
         */
        this._controllerGroup;

        /**
         * @private
         * @type {module:echarts/component/helper/SelectController}
         */
        this._controller;

        /**
         * Is zoom active.
         * @private
         * @type {Object}
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

    proto.render = function (featureModel, ecModel, api) {
        updateBackBtnStatus(featureModel, ecModel);
    };

    proto.onclick = function (ecModel, api, type) {
        var controllerGroup = this._controllerGroup;
        if (!this._controllerGroup) {
            controllerGroup = this._controllerGroup = new Group();
            api.getZr().add(controllerGroup);
        }

        handlers[type].call(this, controllerGroup, this.model, ecModel, api);
    };

    proto.remove = function (ecModel, api) {
        this._disposeController();
        interactionMutex.release('globalPan', api.getZr());
    };

    proto.dispose = function (ecModel, api) {
        var zr = api.getZr();
        interactionMutex.release('globalPan', zr);
        this._disposeController();
        this._controllerGroup && zr.remove(this._controllerGroup);
    };

    /**
     * @private
     */
    var handlers = {

        zoom: function (controllerGroup, featureModel, ecModel, api) {
            var isZoomActive = this._isZoomActive = !this._isZoomActive;
            var zr = api.getZr();

            interactionMutex[isZoomActive ? 'take' : 'release']('globalPan', zr);

            featureModel.setIconStatus('zoom', isZoomActive ? 'emphasis' : 'normal');

            if (isZoomActive) {
                zr.setDefaultCursorStyle('crosshair');

                this._createController(
                    controllerGroup, featureModel, ecModel, api
                );
            }
            else {
                zr.setDefaultCursorStyle('default');
                this._disposeController();
            }
        },

        back: function (controllerGroup, featureModel, ecModel, api) {
            this._dispatchAction(history.pop(ecModel), api);
        }
    };

    /**
     * @private
     */
    proto._createController = function (
        controllerGroup, featureModel, ecModel, api
    ) {
        var controller = this._controller = new SelectController(
            'rect',
            api.getZr(),
            {
                // FIXME
                lineWidth: 3,
                stroke: '#333',
                fill: 'rgba(0,0,0,0.2)'
            }
        );
        controller.on(
            'selectEnd',
            zrUtil.bind(
                this._onSelected, this, controller,
                featureModel, ecModel, api
            )
        );
        controller.enable(controllerGroup, false);
    };

    proto._disposeController = function () {
        var controller = this._controller;
        if (controller) {
            controller.off('selected');
            controller.dispose();
        }
    };

    function prepareCoordInfo(grid, ecModel) {
        // Default use the first axis.
        // FIXME
        var coordInfo = [
            {axisModel: grid.getAxis('x').model, axisIndex: 0}, // x
            {axisModel: grid.getAxis('y').model, axisIndex: 0}  // y
        ];
        coordInfo.grid = grid;

        ecModel.eachComponent(
            {mainType: 'dataZoom', subType: 'select'},
            function (dzModel, dataZoomIndex) {
                if (isTheAxis('xAxis', coordInfo[0].axisModel, dzModel, ecModel)) {
                    coordInfo[0].dataZoomModel = dzModel;
                }
                if (isTheAxis('yAxis', coordInfo[1].axisModel, dzModel, ecModel)) {
                    coordInfo[1].dataZoomModel = dzModel;
                }
            }
        );

        return coordInfo;
    }

    function isTheAxis(axisName, axisModel, dataZoomModel, ecModel) {
        var axisIndex = dataZoomModel.get(axisName + 'Index');
        return axisIndex != null
            && ecModel.getComponent(axisName, axisIndex) === axisModel;
    }

    /**
     * @private
     */
    proto._onSelected = function (controller, featureModel, ecModel, api, selRanges) {
        if (!selRanges.length) {
            return;
        }
        var selRange = selRanges[0];

        controller.update(); // remove cover

        var snapshot = {};

        // FIXME
        // polar

        ecModel.eachComponent('grid', function (gridModel, gridIndex) {
            var grid = gridModel.coordinateSystem;
            var coordInfo = prepareCoordInfo(grid, ecModel);
            var selDataRange = pointToDataInCartesian(selRange, coordInfo);

            if (selDataRange) {
                var xBatchItem = scaleCartesianAxis(selDataRange, coordInfo, 0, 'x');
                var yBatchItem = scaleCartesianAxis(selDataRange, coordInfo, 1, 'y');

                xBatchItem && (snapshot[xBatchItem.dataZoomId] = xBatchItem);
                yBatchItem && (snapshot[yBatchItem.dataZoomId] = yBatchItem);
            }
        }, this);

        history.push(ecModel, snapshot);

        this._dispatchAction(snapshot, api);
    };

    function pointToDataInCartesian(selRange, coordInfo) {
        var grid = coordInfo.grid;

        var selRect = new BoundingRect(
            selRange[0][0],
            selRange[1][0],
            selRange[0][1] - selRange[0][0],
            selRange[1][1] - selRange[1][0]
        );
        if (!selRect.intersect(grid.getRect())) {
            return;
        }
        var cartesian = grid.getCartesian(coordInfo[0].axisIndex, coordInfo[1].axisIndex);
        var dataLeftTop = cartesian.pointToData([selRange[0][0], selRange[1][0]], true);
        var dataRightBottom = cartesian.pointToData([selRange[0][1], selRange[1][1]], true);

        return [
            asc([dataLeftTop[0], dataRightBottom[0]]), // x, using asc to handle inverse
            asc([dataLeftTop[1], dataRightBottom[1]]) // y, using asc to handle inverse
        ];
    }

    function scaleCartesianAxis(selDataRange, coordInfo, dimIdx, dimName) {
        var dimCoordInfo = coordInfo[dimIdx];
        var dataZoomModel = dimCoordInfo.dataZoomModel;

        if (dataZoomModel) {
            return {
                dataZoomId: dataZoomModel.id,
                startValue: selDataRange[dimIdx][0],
                endValue: selDataRange[dimIdx][1]
            };
        }
    }

    /**
     * @private
     */
    proto._dispatchAction = function (snapshot, api) {
        var batch = [];

        each(snapshot, function (batchItem) {
            batch.push(batchItem);
        });

        batch.length && api.dispatchAction({
            type: 'dataZoom',
            from: this.uid,
            batch: zrUtil.clone(batch, true)
        });
    };

    function updateBackBtnStatus(featureModel, ecModel) {
        featureModel.setIconStatus(
            'back',
            history.count(ecModel) > 1 ? 'emphasis' : 'normal'
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
            dataZoomOpts = [dataZoomOpts];
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

            var axisIndicesName = axisName + 'Index';
            var givenAxisIndices = dataZoomOpt[axisIndicesName];
            if (givenAxisIndices != null && !zrUtil.isArray(givenAxisIndices)) {
                givenAxisIndices = givenAxisIndices === false ? [] : [givenAxisIndices];
            }

            forEachComponent(axisName, function (axisOpt, axisIndex) {
                if (givenAxisIndices != null
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