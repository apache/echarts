/**
 * @file History manager.
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');
    var each = zrUtil.each;

    var ATTR = '\0_ec_hist_mgr';

    /**
     * Only one instance exists in one chart instance.
     *
     * @class
     */
    var HistoryManager = function (ecModel) {
        /**
         * @readOnly
         * @type {module: echarts/model/Global}
         */
        this.ecModel = ecModel;

        /**
         * [{key: dataZoomId, value: {dataZoomId, range}}, ...]
         * History length of each dataZoom may be different.
         * this._history[0] is used to store origin range.
         * @private
         * @type {Array.<Object>}
         */
        this._history = [{}];
    };

    HistoryManager.prototype = {

        constructor: HistoryManager,

        /**
         * @public
         * @param {Object} newSnapshot {dataZoomId, batch: [payloadInfo, ...]}
         */
        push: function (newSnapshot) {
            var history = this._history;
            var ecModel = this.ecModel;

            // If previous dataZoom can not be found,
            // complete an range with current range.
            each(newSnapshot, function (batchItem, dataZoomId) {
                var i = history.length - 1;
                for (; i >= 0; i--) {
                    var snapshot = history[i];
                    if (snapshot[dataZoomId]) {
                        break;
                    }
                }
                if (i < 0) {
                    // No origin range set, create one by current range.
                    var dataZoomModel = ecModel.queryComponents(
                        {mainType: 'dataZoom', subType: 'select', id: dataZoomId}
                    )[0];
                    if (dataZoomModel) {
                        var percentRange = dataZoomModel.getPercentRange();
                        history[0][dataZoomId] = {
                            dataZoomId: dataZoomId,
                            start: percentRange[0],
                            end: percentRange[1]
                        };
                    }
                }
            });

            history.push(newSnapshot);
        },

        /**
         * @public
         * @return {Object} snapshot
         */
        pop: function () {
            var history = this._history;
            var head = history[history.length - 1];
            history.length > 1 && history.pop();

            // Find top for all dataZoom.
            var snapshot = {};
            each(head, function (batchItem, dataZoomId) {
                for (var i = history.length - 1; i >= 0; i--) {
                    var batchItem = history[i][dataZoomId];
                    if (batchItem) {
                        snapshot[dataZoomId] = batchItem;
                        break;
                    }
                }
            });

            return snapshot;
        },

        /**
         * @public
         */
        clear: function () {
            this._history = [{}];
        },

        /**
         * @public
         * @return {number} records. always >= 1.
         */
        count: function () {
            return this._history.length;
        }

    };

    /**
     * @return {module:echarts/component/dataZoom/HistoryManager}
     */
    HistoryManager.getInstance = function (ecModel) {
        var instance = ecModel[ATTR];
        if (!instance) {
            instance = ecModel[ATTR] = new HistoryManager(ecModel);
        }
        return instance;
    };

    return HistoryManager;

});