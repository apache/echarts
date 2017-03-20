define(function(require) {

    var env = require('zrender/core/env');
    var zrUtil = require('zrender/core/util');
    var get = require('../../util/model').makeGetter();

    var each = zrUtil.each;

    var globalListener = {};

    /**
     * @param {string} key
     * @param {module:echarts/ExtensionAPI} api
     * @param {Function} handler
     *      param: {string} currTrigger
     *      param: {Array.<number>} point
     */
    globalListener.register = function (key, api, handler) {
        if (env.node) {
            return;
        }

        var zr = api.getZr();
        get(zr).records || (get(zr).records = {});

        initGlobalListeners(zr, api);

        var record = get(zr).records[key] || (get(zr).records[key] = {});
        record.handler = handler;
    };

    function initGlobalListeners(zr, api) {
        if (get(zr).initialized) {
            return;
        }

        get(zr).initialized = true;

        useHandler('click', zrUtil.curry(doEnter, 'click'));
        useHandler('mousemove', zrUtil.curry(doEnter, 'mousemove'));
        // useHandler('mouseout', onLeave);
        useHandler('globalout', onLeave);

        function useHandler(eventType, cb) {
            zr.on(eventType, function (e) {
                var dis = makeDispatchAction(api);

                each(get(zr).records, function (record) {
                    record && cb(record, e, dis.dispatchAction);
                });

                dispatchTooltipFinally(dis.pendings, api);
            });
        }
    }

    function dispatchTooltipFinally(pendings, api) {
        var showLen = pendings.showTip.length;
        var hideLen = pendings.hideTip.length;

        var actuallyPayload;
        if (showLen) {
            actuallyPayload = pendings.showTip[showLen - 1];
        }
        else if (hideLen) {
            actuallyPayload = pendings.hideTip[hideLen - 1];
        }
        if (actuallyPayload) {
            actuallyPayload.dispatchAction = null;
            api.dispatchAction(actuallyPayload);
        }
    }

    function onLeave(record, e, dispatchAction) {
        record.handler('leave', null, dispatchAction);
    }

    function doEnter(currTrigger, record, e, dispatchAction) {
        record.handler(currTrigger, e, dispatchAction);
    }

    function makeDispatchAction(api) {
        var pendings = {
            showTip: [],
            hideTip: []
        };
        // FIXME
        // better approach?
        // 'showTip' and 'hideTip' can be triggered by axisPointer and tooltip,
        // which may be conflict, (axisPointer call showTip but tooltip call hideTip);
        // So we have to add "final stage" to merge those dispatched actions.
        var dispatchAction = function (payload) {
            var pendingList = pendings[payload.type];
            if (pendingList) {
                pendingList.push(payload);
            }
            else {
                payload.dispatchAction = dispatchAction;
                api.dispatchAction(payload);
            }
        };

        return {
            dispatchAction: dispatchAction,
            pendings: pendings
        };
    }

    /**
     * @param {string} key
     * @param {module:echarts/ExtensionAPI} api
     */
    globalListener.unregister = function (key, api) {
        if (env.node) {
            return;
        }
        var zr = api.getZr();
        var record = (get(zr).records || {})[key];
        if (record) {
            get(zr).records[key] = null;
        }
    };

    return globalListener;
});