
/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

var _config = require("../config");

var __DEV__ = _config.__DEV__;

var zrUtil = require("zrender/lib/core/util");

/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/
var TYPE_DELIMITER = '.';
var IS_CONTAINER = '___EC__COMPONENT__CONTAINER___';
/**
 * Notice, parseClassType('') should returns {main: '', sub: ''}
 * @public
 */

function parseClassType(componentType) {
  var ret = {
    main: '',
    sub: ''
  };

  if (componentType) {
    componentType = componentType.split(TYPE_DELIMITER);
    ret.main = componentType[0] || '';
    ret.sub = componentType[1] || '';
  }

  return ret;
}
/**
 * @public
 */


function checkClassType(componentType) {
  zrUtil.assert(/^[a-zA-Z0-9_]+([.][a-zA-Z0-9_]+)?$/.test(componentType), 'componentType "' + componentType + '" illegal');
}
/**
 * @public
 */


function enableClassExtend(RootClass, mandatoryMethods) {
  RootClass.$constructor = RootClass;

  RootClass.extend = function (proto) {
    var superClass = this;

    var ExtendedClass = function () {
      if (!proto.$constructor) {
        superClass.apply(this, arguments);
      } else {
        proto.$constructor.apply(this, arguments);
      }
    };

    zrUtil.extend(ExtendedClass.prototype, proto);
    ExtendedClass.extend = this.extend;
    ExtendedClass.superCall = superCall;
    ExtendedClass.superApply = superApply;
    zrUtil.inherits(ExtendedClass, this);
    ExtendedClass.superClass = superClass;
    return ExtendedClass;
  };
}

var classBase = 0;
/**
 * Can not use instanceof, consider different scope by
 * cross domain or es module import in ec extensions.
 * Mount a method "isInstance()" to Clz.
 */

function enableClassCheck(Clz) {
  var classAttr = ['__\0is_clz', classBase++, Math.random().toFixed(3)].join('_');
  Clz.prototype[classAttr] = true;

  Clz.isInstance = function (obj) {
    return !!(obj && obj[classAttr]);
  };
} // superCall should have class info, which can not be fetch from 'this'.
// Consider this case:
// class A has method f,
// class B inherits class A, overrides method f, f call superApply('f'),
// class C inherits class B, do not overrides method f,
// then when method of class C is called, dead loop occured.


function superCall(context, methodName) {
  var args = zrUtil.slice(arguments, 2);
  return this.superClass.prototype[methodName].apply(context, args);
}

function superApply(context, methodName, args) {
  return this.superClass.prototype[methodName].apply(context, args);
}
/**
 * @param {Object} entity
 * @param {Object} options
 * @param {boolean} [options.registerWhenExtend]
 * @public
 */


function enableClassManagement(entity, options) {
  options = options || {};
  /**
   * Component model classes
   * key: componentType,
   * value:
   *     componentClass, when componentType is 'xxx'
   *     or Object.<subKey, componentClass>, when componentType is 'xxx.yy'
   * @type {Object}
   */

  var storage = {};

  entity.registerClass = function (Clazz, componentType) {
    if (componentType) {
      checkClassType(componentType);
      componentType = parseClassType(componentType);

      if (!componentType.sub) {
        storage[componentType.main] = Clazz;
      } else if (componentType.sub !== IS_CONTAINER) {
        var container = makeContainer(componentType);
        container[componentType.sub] = Clazz;
      }
    }

    return Clazz;
  };

  entity.getClass = function (componentMainType, subType, throwWhenNotFound) {
    var Clazz = storage[componentMainType];

    if (Clazz && Clazz[IS_CONTAINER]) {
      Clazz = subType ? Clazz[subType] : null;
    }

    if (throwWhenNotFound && !Clazz) {
      throw new Error(!subType ? componentMainType + '.' + 'type should be specified.' : 'Component ' + componentMainType + '.' + (subType || '') + ' not exists. Load it first.');
    }

    return Clazz;
  };

  entity.getClassesByMainType = function (componentType) {
    componentType = parseClassType(componentType);
    var result = [];
    var obj = storage[componentType.main];

    if (obj && obj[IS_CONTAINER]) {
      zrUtil.each(obj, function (o, type) {
        type !== IS_CONTAINER && result.push(o);
      });
    } else {
      result.push(obj);
    }

    return result;
  };

  entity.hasClass = function (componentType) {
    // Just consider componentType.main.
    componentType = parseClassType(componentType);
    return !!storage[componentType.main];
  };
  /**
   * @return {Array.<string>} Like ['aa', 'bb'], but can not be ['aa.xx']
   */


  entity.getAllClassMainTypes = function () {
    var types = [];
    zrUtil.each(storage, function (obj, type) {
      types.push(type);
    });
    return types;
  };
  /**
   * If a main type is container and has sub types
   * @param  {string}  mainType
   * @return {boolean}
   */


  entity.hasSubTypes = function (componentType) {
    componentType = parseClassType(componentType);
    var obj = storage[componentType.main];
    return obj && obj[IS_CONTAINER];
  };

  entity.parseClassType = parseClassType;

  function makeContainer(componentType) {
    var container = storage[componentType.main];

    if (!container || !container[IS_CONTAINER]) {
      container = storage[componentType.main] = {};
      container[IS_CONTAINER] = true;
    }

    return container;
  }

  if (options.registerWhenExtend) {
    var originalExtend = entity.extend;

    if (originalExtend) {
      entity.extend = function (proto) {
        var ExtendedClass = originalExtend.call(this, proto);
        return entity.registerClass(ExtendedClass, proto.type);
      };
    }
  }

  return entity;
}
/**
 * @param {string|Array.<string>} properties
 */


function setReadOnly(obj, properties) {// FIXME It seems broken in IE8 simulation of IE11
  // if (!zrUtil.isArray(properties)) {
  //     properties = properties != null ? [properties] : [];
  // }
  // zrUtil.each(properties, function (prop) {
  //     var value = obj[prop];
  //     Object.defineProperty
  //         && Object.defineProperty(obj, prop, {
  //             value: value, writable: false
  //         });
  //     zrUtil.isArray(obj[prop])
  //         && Object.freeze
  //         && Object.freeze(obj[prop]);
  // });
}

exports.parseClassType = parseClassType;
exports.enableClassExtend = enableClassExtend;
exports.enableClassCheck = enableClassCheck;
exports.enableClassManagement = enableClassManagement;
exports.setReadOnly = setReadOnly;