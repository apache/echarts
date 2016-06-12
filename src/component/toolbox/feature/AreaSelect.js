define(function(require) {
    'use strict';

    var featureManager = require('../featureManager');
    var zrUtil = require('zrender/core/util');
    var SelectController = require('../../helper/SelectController');
    var Group = require('zrender/container/Group');
    var interactionMutex = require('../../helper/interactionMutex');
    // var throttle = require('../../../util/throttle');

    // var THROTTLE_RATE = 200;
    var MAP_SELECTED = 1;
    var MAP_UNSELECTED = 0;
    var MAP_BROADCAST = 2;

    function AreaSelect(model, ecModel, api) {

        this.model = model;
        this.ecModel = ecModel;
        this.api = api;

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
         * 'rect' or 'pencil' or null/undefined
         * @private
         * @type {string}
         */
        this._type;
    }


    AreaSelect.defaultOption = {
        show: true,
        type: ['rect', 'pencil'],
        icon: {
            // FIXME
            rect: 'M0,13.5h26.9 M13.5,26.9V0 M32.1,13.5H58V58H13.5 V32.1',
            // FIXME
            pencil: 'M0,13.5h26.9 M13.5,26.9V0 M32.1,13.5H58V58H13.5 V32.1'
        },
        title: {
            rect: '矩形选择',
            pencil: '圈选'
        },
        connect: false      // Whether broadcast in selectable series.
    };


    var proto = AreaSelect.prototype;

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

    // proto.render = function () {
        // FIXME
        // throttle.createOrUpdate(
        //     this,
        //     '_dispatchAction',
        //     THROTTLE_RATE,
        //     'fixRate'
        // );
    // };

    proto.onclick = function (ecModel, api, type) {
        var controllerGroup = this._controllerGroup;
        if (!this._controllerGroup) {
            controllerGroup = this._controllerGroup = new Group();
            api.getZr().add(controllerGroup);
        }

        this._switchType(type);
    };

    proto.remove = function (ecModel, api) {
        this._disposeController();
        interactionMutex.release(api.getZr(), 'globalPan', 'areaSelect');
    };

    proto.dispose = function (ecModel, api) {
        var zr = api.getZr();
        interactionMutex.release(zr, 'globalPan', 'areaSelect');
        this._disposeController();
        this._controllerGroup && zr.remove(this._controllerGroup);
    };

    /**
     * @private
     */
    proto._switchType = function (clickedType) {
        var oldType = this._type;
        var thisType = clickedType === oldType ? null : clickedType;
        var zr = this.api.getZr();

        if (thisType) {
            interactionMutex.take(zr, 'globalPan', 'areaSelect', zrUtil.bind(onRelease, this));

            this._type = thisType;
            this.model.setIconStatus(thisType, 'emphasis');
            zr.setDefaultCursorStyle('crosshair');
            this._createController();
        }
        else {
            interactionMutex.release(zr, 'globalPan', 'areaSelect');
        }

        function onRelease() {
            this.model.setIconStatus('rect', 'normal');
            this.model.setIconStatus('pencil', 'normal');
            zr.setDefaultCursorStyle('default');
            this._disposeController();
            this._type = null;
        }
    };

    /**
     * @private
     */
    proto._createController = function () {
        (this._controller = new SelectController(
            this._type,
            this.api.getZr(),
            {
                // lineWidth: 2,
                // stroke: 'rgba(0,0,0,0.3)',
                fill: 'rgba(0,0,0,0.15)',
                transformEnabled: true
            }
        ))
            .on('selected', zrUtil.bind(this._onSelected, this))
            .enable(this._controllerGroup, false);
    };

    /**
     * @private
     */
    proto._disposeController = function () {
        var controller = this._controller;
        if (controller) {
            controller.off();
            controller.dispose();
        }
    };

    /**
     * @private
     */
    proto._onSelected = function (selRanges, isEnd) {
        var batch = findSelectedItems(this.model, selRanges, this._controller, this.ecModel);
        this._dispatchAction(batch);
    };

    proto._dispatchAction = function (batch) {
        this.api.dispatchAction({type: 'select', batch: batch});
    };

    function findSelectedItems(model, selRanges, controller, ecModel) {
        var hasSel = !!selRanges.length;

        // FIXME
        var connect = model.option.connect;
        var seriesToBroadcast = [];
        if (connect === 'all') {
            ecModel.eachSeries(function (seriesModel) {
                isSelectable(seriesModel) && seriesToBroadcast.push(seriesModel);
            });
        }

        var batchBySeries = {};
        var batch = [];

        // Create dataIndexMap in first step for broadcast.
        ecModel.eachSeries(function (seriesModel, seriesIndex) {
            if (isSelectable(seriesModel)) {
                // If only click but not drag, selRanges.length is 0,
                // batchItem.dataIndexMap should be undefined, which
                // indicate series shoule be set back to normal.
                var batchItem = {seriesId: seriesModel.id};
                batch.push(batchItem);
                batchBySeries[batchItem.seriesId] = batchItem;

                if (hasSel) {
                    batchItem.dataIndexMap =
                        seriesModel.getSelectedDataIndexMap()
                        || Array(seriesModel.getData().count());
                }
            }
        });

        ecModel.eachSeries(function (seriesModel, seriesIndex) {
            if (!isSelectable(seriesModel) || !hasSel) {
                return;
            }

            // Do not re-create dataIndexMap but reuse it as it might be a big object.
            var data = seriesModel.getData();
            var dataIndexMap = batchBySeries[seriesModel.id].dataIndexMap;

            data.each(function (dataIndex) {
                var el = data.getItemGraphicEl(dataIndex);
                if (!el) {
                    return;
                }
                var centerPosition = el.centerPosition;
                if (centerPosition && controller.isInRange(centerPosition)) {
                    dataIndexMap[dataIndex] = MAP_SELECTED;

                    zrUtil.each(seriesToBroadcast, function (serModel) {
                        if (serModel !== seriesModel) {
                            batchBySeries[serModel.id].dataIndexMap[dataIndex] = MAP_BROADCAST;
                        }
                    });
                }
                else if (dataIndexMap[dataIndex] !== MAP_BROADCAST) {
                    dataIndexMap[dataIndex] = MAP_UNSELECTED;
                }
            });

            dataIndexMap.length = data.count(); // Cut remains
        });

        ecModel.eachSeries(function (seriesModel, seriesIndex) {
            if (isSelectable(seriesModel) && hasSel) {
                var dataIndexMap = batchBySeries[seriesModel.id].dataIndexMap;
                var data = seriesModel.getData();
                dataIndexMap && data.each(function (dataIndex) {
                    dataIndexMap[dataIndex] === MAP_BROADCAST
                        && (dataIndexMap[dataIndex] = MAP_SELECTED);
                });
            }
        });

        return batch;
    }

    function isSelectable(seriesModel) {
        return !!seriesModel.getSelectedDataIndexMap;
    }


    featureManager.register('areaSelect', AreaSelect);

    return AreaSelect;
});