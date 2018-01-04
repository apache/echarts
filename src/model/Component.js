/**
 * Component model
 *
 * @module echarts/model/Component
 */

import * as zrUtil from 'zrender/src/core/util';
import Model from './Model';
import * as componentUtil from '../util/component';
import {enableClassManagement, parseClassType} from '../util/clazz';
import {makeInner} from '../util/model';
import * as layout from '../util/layout';
import boxLayoutMixin from './mixin/boxLayout';

var inner = makeInner();

/**
 * @alias module:echarts/model/Component
 * @constructor
 * @param {Object} option
 * @param {module:echarts/model/Model} parentModel
 * @param {module:echarts/model/Model} ecModel
 */
var ComponentModel = Model.extend({

    type: 'component',

    /**
     * @readOnly
     * @type {string}
     */
    id: '',

    /**
     * @readOnly
     */
    name: '',

    /**
     * @readOnly
     * @type {string}
     */
    mainType: '',

    /**
     * @readOnly
     * @type {string}
     */
    subType: '',

    /**
     * @readOnly
     * @type {number}
     */
    componentIndex: 0,

    /**
     * @type {Object}
     * @protected
     */
    defaultOption: null,

    /**
     * @type {module:echarts/model/Global}
     * @readOnly
     */
    ecModel: null,

    /**
     * key: componentType
     * value:  Component model list, can not be null.
     * @type {Object.<string, Array.<module:echarts/model/Model>>}
     * @readOnly
     */
    dependentModels: [],

    /**
     * @type {string}
     * @readOnly
     */
    uid: null,

    /**
     * Support merge layout params.
     * Only support 'box' now (left/right/top/bottom/width/height).
     * @type {string|Object} Object can be {ignoreSize: true}
     * @readOnly
     */
    layoutMode: null,

    $constructor: function (option, parentModel, ecModel, extraOpt) {
        Model.call(this, option, parentModel, ecModel, extraOpt);

        this.uid = componentUtil.getUID('componentModel');
    },


    init: function (option, parentModel, ecModel, extraOpt) {
        this.mergeDefaultAndTheme(option, ecModel);
    },

    mergeDefaultAndTheme: function (option, ecModel) {
        var layoutMode = this.layoutMode;
        var inputPositionParams = layoutMode
            ? layout.getLayoutParams(option) : {};

        var themeModel = ecModel.getTheme();
        zrUtil.merge(option, themeModel.get(this.mainType));
        zrUtil.merge(option, this.getDefaultOption());

        if (layoutMode) {
            layout.mergeLayoutParam(option, inputPositionParams, layoutMode);
        }
    },

    mergeOption: function (option, extraOpt) {
        zrUtil.merge(this.option, option, true);

        var layoutMode = this.layoutMode;
        if (layoutMode) {
            layout.mergeLayoutParam(this.option, option, layoutMode);
        }
    },

    // Hooker after init or mergeOption
    optionUpdated: function (newCptOption, isInit) {},

    getDefaultOption: function () {
        var fields = inner(this);
        if (!fields.defaultOption) {
            var optList = [];
            var Class = this.constructor;
            while (Class) {
                var opt = Class.prototype.defaultOption;
                opt && optList.push(opt);
                Class = Class.superClass;
            }

            var defaultOption = {};
            for (var i = optList.length - 1; i >= 0; i--) {
                defaultOption = zrUtil.merge(defaultOption, optList[i], true);
            }
            fields.defaultOption = defaultOption;
        }
        return fields.defaultOption;
    },

    getReferringComponents: function (mainType) {
        return this.ecModel.queryComponents({
            mainType: mainType,
            index: this.get(mainType + 'Index', true),
            id: this.get(mainType + 'Id', true)
        });
    }

});

// Reset ComponentModel.extend, add preConstruct.
// clazzUtil.enableClassExtend(
//     ComponentModel,
//     function (option, parentModel, ecModel, extraOpt) {
//         // Set dependentModels, componentIndex, name, id, mainType, subType.
//         zrUtil.extend(this, extraOpt);

//         this.uid = componentUtil.getUID('componentModel');

//         // this.setReadOnly([
//         //     'type', 'id', 'uid', 'name', 'mainType', 'subType',
//         //     'dependentModels', 'componentIndex'
//         // ]);
//     }
// );

// Add capability of registerClass, getClass, hasClass, registerSubTypeDefaulter and so on.
enableClassManagement(
    ComponentModel, {registerWhenExtend: true}
);
componentUtil.enableSubTypeDefaulter(ComponentModel);

// Add capability of ComponentModel.topologicalTravel.
componentUtil.enableTopologicalTravel(ComponentModel, getDependencies);

function getDependencies(componentType) {
    var deps = [];
    zrUtil.each(ComponentModel.getClassesByMainType(componentType), function (Clazz) {
        deps = deps.concat(Clazz.prototype.dependencies || []);
    });

    // Ensure main type.
    deps = zrUtil.map(deps, function (type) {
        return parseClassType(type).main;
    });

    // Hack dataset for convenience.
    if (componentType !== 'dataset' && zrUtil.indexOf(deps, 'dataset') <= 0) {
        deps.unshift('dataset');
    }

    return deps;
}

zrUtil.mixin(ComponentModel, boxLayoutMixin);

export default ComponentModel;