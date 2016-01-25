define(function (require) {

    var zrUtil = require('zrender/core/util');

    var clazz = {};

    var TYPE_DELIMITER = '.';
    var IS_CONTAINER = '___EC__COMPONENT__CONTAINER___';
    /**
     * @public
     */
    var parseClassType = clazz.parseClassType = function (componentType) {
        var ret = {main: '', sub: ''};
        if (componentType) {
            componentType = componentType.split(TYPE_DELIMITER);
            ret.main = componentType[0] || '';
            ret.sub = componentType[1] || '';
        }
        return ret;
    };
    /**
     * @public
     */
    clazz.enableClassExtend = function (RootClass, preConstruct) {
        RootClass.extend = function (proto) {
            var ExtendedClass = function () {
                preConstruct && preConstruct.apply(this, arguments);
                RootClass.apply(this, arguments);
            };

            zrUtil.extend(ExtendedClass.prototype, zrUtil.extend({
                $superCall: function (methodName) {
                    var args = zrUtil.slice(arguments, 1);
                    return findSuperMethod(this, methodName).apply(this, args);
                },
                $superApply: function (methodName, args) {
                    return findSuperMethod(this, methodName).apply(this, args);
                }
            }, proto));

            ExtendedClass.extend = this.extend;
            zrUtil.inherits(ExtendedClass, this);
            ExtendedClass.$superClass = this;

            return ExtendedClass;
        };
    };

    // Find the first method that different with given metod.
    // If only use closure to implements $superApply and $supperCall,
    // Consider this case:
    // class A has method f,
    // class B inherits class A, overrides method f, f call this.$superApply('f'),
    // class C inherits class B, do not overrides method f,
    // then when method of class C is called, dead loop occured.
    function findSuperMethod(context, methodName) {
        var SuperClass = context.constructor;
        var thisMethod = context[methodName];
        var method;

        while (
            (SuperClass = SuperClass.$superClass)
            && (method = SuperClass.prototype[methodName])
            && method === thisMethod
        ) {/*jshint noempty:false */}

        return method;
    }

    /**
     * @param {Object} entity
     * @param {Object} options
     * @param {boolean} [options.registerWhenExtend]
     * @public
     */
    clazz.enableClassManagement = function (entity, options) {
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
                componentType = parseClassType(componentType);

                if (!componentType.sub) {
                    if (storage[componentType.main]) {
                        throw new Error(componentType.main + 'exists');
                    }
                    storage[componentType.main] = Clazz;
                }
                else if (componentType.sub !== IS_CONTAINER) {
                    var container = makeContainer(componentType);
                    container[componentType.sub] = Clazz;
                }
            }
            return Clazz;
        };

        entity.getClass = function (componentTypeMain, subType, throwWhenNotFound) {
            var Clazz = storage[componentTypeMain];

            if (Clazz && Clazz[IS_CONTAINER]) {
                Clazz = subType ? Clazz[subType] : null;
            }

            if (throwWhenNotFound && !Clazz) {
                throw new Error(
                    'Component ' + componentTypeMain + '.' + (subType || '') + ' not exists'
                );
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
            }
            else {
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
    };

    /**
     * @param {string|Array.<string>} properties
     */
    clazz.setReadOnly = function (obj, properties) {
        // FIXME It seems broken in IE8 simulation of IE11
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
    };

    return clazz;
});