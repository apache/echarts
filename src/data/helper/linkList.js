/**
 * Link lists and struct (graph or tree)
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var each = zrUtil.each;

    var DATAS = '\0__link_datas';
    var MAIN_DATA = '\0__link_mainData';

    // Caution:
    // In most case, either list or its shallow clones (see list.cloneShallow)
    // is active in echarts process. So considering heap memory consumption,
    // we do not clone tree or graph, but share them among list and its shallow clones.
    // But in some rare case, we have to keep old list (like do animation in chart). So
    // please take care that both the old list and the new list share the same tree/graph.

    /**
     * @param {Object} opt
     * @param {module:echarts/data/List} opt.mainData
     * @param {Object} [opt.struct] For example, instance of Graph or Tree.
     * @param {string} [opt.structAttr] designation: list[structAttr] = struct;
     * @param {Object} [opt.datas] {dataType: data},
     *                 like: {node: nodeList, edge: edgeList}.
     *                 Should contain mainData.
     * @param {Object} [opt.datasAttr] {dataType: attr},
     *                 designation: struct[datasAttr[dataType]] = list;
     */
    function linkList(opt) {
        var mainData = opt.mainData;
        var datas = opt.datas;

        if (!datas) {
            datas = {main: mainData};
            opt.datasAttr = {main: 'data'};
        }
        opt.datas = opt.mainData = null;

        linkAll(mainData, datas, opt);

        // Porxy data original methods.
        each(datas, function (data) {
            each(injections, function (injection, methodName) {
                data.wrapMethod(methodName, zrUtil.curry(injection, opt));
            });
        });

        // Make sure datas contains mainData.
        zrUtil.assert(datas[mainData.dataType] === mainData);
    }

    var injections = {

        __onTransfer: function (opt, res, newData) {
            if (isMainData(this)) {
                // Transfer datas to new main data.
                var datas = zrUtil.extend({}, this[DATAS]);
                datas[this.dataType] = newData;
                linkAll(newData, datas, opt);
            }
            else {
                // Modify the reference in main data to point newData.
                linkSingle(newData, this.dataType, this[MAIN_DATA], opt);
            }
        },

        __onChange: function (opt) {
            opt.struct && opt.struct.update(this);
        },

        cloneShallow: function (opt, newData) {
            // cloneShallow, which brings about some fragilities, may be inappropriate
            // to be exposed as an API. So for implementation simplicity we can make
            // the restriction that cloneShallow of not-mainData should not be invoked
            // outside, but only be invoked here.
            isMainData(this) && each(newData[DATAS], function (data, dataType) {
                data !== newData && linkSingle(data.cloneShallow(), dataType, newData, opt);
            });
            return newData;
        }
    };

    /**
     * Supplement method to List.
     *
     * @public
     * @param {string} [dataType] If not specified, return mainData.
     * @return {module:echarts/data/List}
     */
    function getLinkedData(dataType) {
        var mainData = this[MAIN_DATA];
        return (dataType == null || mainData == null)
            ? mainData
            : mainData[DATAS][dataType];
    }

    function isMainData(data) {
        return data[MAIN_DATA] === data;
    }

    function linkAll(mainData, datas, opt) {
        mainData[DATAS] = {};
        each(datas, function (data, dataType) {
            linkSingle(data, dataType, mainData, opt);
        });
    }

    function linkSingle(data, dataType, mainData, opt) {
        mainData[DATAS][dataType] = data;
        data[MAIN_DATA] = mainData;
        data.dataType = dataType;

        if (opt.struct) {
            data[opt.structAttr] = opt.struct;
            opt.struct[opt.datasAttr[dataType]] = data;
        }

        // Supplement method.
        data.getLinkedData = getLinkedData;
    }

    return linkList;
});