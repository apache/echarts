/**
 * // Scale class management
 * @module echarts/scale/scale
 */
define(function (require) {

    var scaleClasses = {};

    function register(ScaleClass) {
        var type = ScaleClass.prototype.type;
        scaleClasses[type] = ScaleClass;
    }

    function getClass(type) {
        return scaleClasses[type];
    }

    return {
        register: register,
        getClass: getClass
    };
});