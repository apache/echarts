define(function(require) {
    'use strict';

    var echarts = require('../../../echarts');
    var featureManager = require('../featureManager');
    var zrUtil = require('zrender/core/util');
    var SelectController = require('../../helper/SelectController');
    var BoundingRect = require('zrender/core/BoundingRect');
    var Group = require('zrender/container/Group');
    var interactionMutex = require('../../helper/interactionMutex');
    var visualSolution = require('../../../visual/visualSolution');

    var STATE_LIST = ['original', 'inSelect', 'outOfSelect'];
    var STORE_ATTR = '\0__areaSelect';

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
    }


    AreaSelect.defaultOption = {
        show: true,
        icon: 'M0,13.5h26.9 M13.5,26.9V0 M32.1,13.5H58V58H13.5 V32.1',
        title: '区域选择',
        inSelect: {
        },
        outOfSelect: {
            color: '#ccc'
        },
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
        // FIXME
        // reuse the big hash map, avoid GC?
        var selected = getStore(ecModel).selected || {};
        findSelectedItems(selected, this.model, selRanges, ecModel);
        // If dispatch hightlight with empty batch, all will be highlighted.
        api.dispatchAction({
            type: 'select',
            selected: selected
        });
    };

    function findSelectedItems(selected, model, selRanges, ecModel) {
        // If only click but not drag, selRanges is empty.
        if (!selRanges.length) {
            return {};
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
        var broadcastSeries = [];
        if (connect === 'all') {
            ecModel.eachSeries(function (seriesModel) {
                broadcastSeries.push(seriesModel);
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
                    save(seriesModel, dataIndex, 1);

                    zrUtil.each(broadcastSeries, function (serModel) {
                        serModel !== seriesModel && save(seriesModel, dataIndex, 1);
                    });
                }
                else {
                    // FIXME consider other series should.
                    save(seriesModel, dataIndex, 0);
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

        function getIndices(seriesModel) {
            return selected[seriesModel.id] || (selected[seriesModel.id] = []);
        }

        function save(seriesModel, dataIndex, isSel) {
            getIndices(seriesModel)[dataIndex] = isSel;
        }
    }

    // function findSelectedItems(model, selRanges, ecModel) {
    //     // If only click but not drag, selRanges is empty.
    //     if (!selRanges.length) {
    //         return [];
    //     }

    //     var batchBySeries = [];
    //     var selRange = selRanges[0];
    //     var selRect = new BoundingRect(
    //         selRange[0][0],
    //         selRange[1][0],
    //         selRange[0][1] - selRange[0][0],
    //         selRange[1][1] - selRange[1][0]
    //     );

    //     // ????????????
    //     // FIXME
    //     var connect = model.option.connect;
    //     var broadcastSeriesIndices = [];
    //     if (connect === 'all') {
    //         ecModel.eachSeries(function (seriesModel, seriesIndex) {
    //             broadcastSeriesIndices.push(seriesIndex);
    //         });
    //     }

    //     ecModel.eachSeries(function (seriesModel, seriesIndex) {
    //         var data = seriesModel.getData();

    //         data.each(function (dataIndex) {

    //             var el = data.getItemGraphicEl(dataIndex);
    //             if (!el) {
    //                 return;
    //             }

    //             var centerPosition = el.centerPosition;
    //             if (centerPosition
    //                 && selRect.contain(centerPosition[0], centerPosition[1])
    //             ) {
    //                 save(seriesIndex, dataIndex);

    //                 zrUtil.each(broadcastSeriesIndices, function (sidx) {
    //                     sidx !== seriesIndex && save(seriesIndex, dataIndex);
    //                 });
    //             }

    //             // FIXME
    //             // 考虑 bar 图。但是：
    //             // rect 未必是 clone 不可 applyTransform
    //             // var rect = el.getBoundingRect();
    //             // rect.applyTransform(el.transform)
    //             // if (rect.intersect(selRect)) {
    //                 // newBatch.push({
    //                 //     seriesIndex: seriesIndex,
    //                 //     dataIndex: dataIndex
    //                 // });
    //             // }
    //         });
    //     });

    //     var resultBatch = [];
    //     for (var i = 0, len = batchBySeries.length; i < len; i++) {
    //         batchBySeries[i] && resultBatch.push({seriesIndex: i, dataIndex: batchBySeries[i]});
    //     }

    //     return resultBatch;

    //     function save(seriesIndex, dataIndex) {
    //         (batchBySeries[seriesIndex] || (batchBySeries[seriesIndex] = [])).push(dataIndex);
    //     }
    // }

    function getStore(ecModel) {
        return ecModel[STORE_ATTR] || (ecModel[STORE_ATTR] = {});
    }



    featureManager.register('areaSelect', AreaSelect);



    echarts.registerAction(
        {
            type: 'select',
            event: 'select',
            update: 'updateView'
        },
        function (payload, ecModel) {
            getStore(ecModel).selected = payload.selected;
        }
    );



    // FIXME priority + 10 ?
    echarts.registerVisual(echarts.PRIORITY.VISUAL.COMPONENT + 10, function (ecModel) {
        var toolboxModel = ecModel.getComponent('toolbox');

        if (!toolboxModel) {
            return;
        }

        // FIXME
        // test
        var visualMappings = toolboxModel.__visualMappings;

        if (!visualMappings) {
            var option = (toolboxModel.option.feature || {}).areaSelect || {};
            visualMappings = visualSolution.createVisualMappings(
                option, STATE_LIST, function (mappingOption) {
                    mappingOption.mappingMethod = 'fixed';
                }
            );
            toolboxModel.__visualMappings = visualMappings;
        }

        var selected = getStore(ecModel).selected;
        var notEmpty;
        for (var id in selected) {
            notEmpty = true;
        }

        // FIXME
        // all series?
        ecModel.eachSeries(function (seriesModel) {
            var data = seriesModel.getData();

            visualSolution.applyVisual(
                STATE_LIST,
                visualMappings,
                data,
                !notEmpty ? returnOriginal : getValueState
                // getValueState,
                // ecModel
            );

            function getValueState(dataIndex) {
                var dataIndices = selected[seriesModel.id];
                return (dataIndices && dataIndices[dataIndex]) ? 'inSelect' : 'outOfSelect';
            }

            function returnOriginal() {
                return 'original';
            }
        });
    });


    return AreaSelect;
});