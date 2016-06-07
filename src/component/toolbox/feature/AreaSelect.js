define(function(require) {
    'use strict';

    var zrUtil = require('zrender/core/util');
    var SelectController = require('../../helper/SelectController');
    var BoundingRect = require('zrender/core/BoundingRect');
    var Group = require('zrender/container/Group');
    var interactionMutex = require('../../helper/interactionMutex');
    var modelUtil = require('../../../util/model');

    function AreaSelect(model) {

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
         * Is in select state.
         * @private
         * @type {Object}
         */
        this._isActive;

        /**
         * @private
         * @type {Array}
         */
        this._activeBatch;
    }

    AreaSelect.defaultOption = {
        show: true,
        icon: 'M0,13.5h26.9 M13.5,26.9V0 M32.1,13.5H58V58H13.5 V32.1',
        title: '区域选择',
        connect: null // Can be 'all' or array of series index.
    };

    var proto = AreaSelect.prototype;

    proto.onclick = function (ecModel, api, type) {
        var controllerGroup = this._controllerGroup;
        if (!this._controllerGroup) {
            controllerGroup = this._controllerGroup = new Group();
            api.getZr().add(controllerGroup);
        }

        this._switchActive(controllerGroup, this.model, ecModel, api);
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
    proto._switchActive = function (controllerGroup, featureModel, ecModel, api) {
        var isActive = this._isActive = !this._isActive;
        var zr = api.getZr();

        interactionMutex[isActive ? 'take' : 'release']('globalPan', zr);

        featureModel.setIconStatus('areaSelect', isActive ? 'emphasis' : 'normal');

        if (isActive) {
            zr.setDefaultCursorStyle('crosshair');

            this._createController(
                controllerGroup, featureModel, ecModel, api
            );
        }
        else {
            zr.setDefaultCursorStyle('default');
            this._disposeController();
        }
    };

    /**
     * @private
     */
    proto._createController = function (controllerGroup, featureModel, ecModel, api) {
        var controller = this._controller = new SelectController(
            'rect',
            api.getZr(),
            {
                lineWidth: 3,
                stroke: 'rgba(0,0,0,0.7)',
                fill: 'rgba(0,0,0,0.2)',
                resizeEnabled: true
            }
        );

        controller.on(
            'selected',
            zrUtil.bind(this._onSelected, this, featureModel, ecModel, api)
        );

        controller.enable(controllerGroup, false);
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
    proto._onSelected = function (featureModel, ecModel, api, selRanges, isEnd) {
        var newBatch = findSelectedItems(this.model, selRanges, ecModel);

        var resultBatches = modelUtil.removeDuplicate(this._activeBatch, newBatch, function (item) {
            return item.seriesIndex + '-' + item.dataIndex;
        });

        this._activeBatch = newBatch;

        // If dispatch hightlight with empty batch, all will be highlighted.
        resultBatches[1].length && api.dispatchAction({
            type: 'highlight',
            batch: resultBatches[1]
        });
        resultBatches[0].length && api.dispatchAction({
            type: 'downplay',
            batch: resultBatches[0]
        });
    };

    function findSelectedItems(model, selRanges, ecModel) {
        var newBatch = [];

        // If only click but not drag, selRanges is empty.
        if (!selRanges.length) {
            return newBatch;
        }

        var selRange = selRanges[0];

        var selRect = new BoundingRect(
            selRange[0][0],
            selRange[1][0],
            selRange[0][1] - selRange[0][0],
            selRange[1][1] - selRange[1][0]
        );

        // ????????????
        // FIXME
        var connect = model.option.connect;
        var broadcastSeriesIndices = [];
        if (connect === 'all') {
            ecModel.eachSeries(function (seriesModel, seriesIndex) {
                broadcastSeriesIndices.push(seriesIndex);
            });
        }

        ecModel.eachSeries(function (seriesModel, seriesIndex) {
            var data = seriesModel.getData();

            data.each(function (dataIndex) {

                var el = data.getItemGraphicEl(dataIndex);
                if (!el) {
                    return;
                }

                var centerPosition = el.centerPosition;
                if (centerPosition
                    && selRect.contain(centerPosition[0], centerPosition[1])
                ) {
                    newBatch.push({
                        seriesIndex: seriesIndex,
                        dataIndex: dataIndex
                    });

                    zrUtil.each(broadcastSeriesIndices, function (sidx) {
                        sidx !== seriesIndex && newBatch.push({
                            seriesIndex: sidx,
                            dataIndex: dataIndex
                        });
                    });
                    // FIXME
                    // 去重
                }

                // FIXME
                // 考虑 bar 图。但是：
                // rect 未必是 clone 不可 applyTransform
                // var rect = el.getBoundingRect();
                // rect.applyTransform(el.transform)
                // if (rect.intersect(selRect)) {
                    // newBatch.push({
                    //     seriesIndex: seriesIndex,
                    //     dataIndex: dataIndex
                    // });
                // }
            });
        });

        return newBatch;
    }

    require('../featureManager').register('areaSelect', AreaSelect);

    return AreaSelect;
});