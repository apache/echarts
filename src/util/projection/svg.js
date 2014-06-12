/**
 * echarts地图一般投射算法
 * modify from GeoMap v0.5.3 https://github.com/x6doooo/GeoMap
 * 
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function() {
    var PathShape = require('zrender/shape/Path');
    var CircleShape = require('zrender/shape/Circle');
    
    function getBbox(root) {
        var firstChild = root.firstChild;
        return {
            left : firstChild.getAttribute('x').replace('px', '') - 0,
            top : firstChild.getAttribute('y').replace('px', '') - 0,
            width : firstChild.getAttribute('width').replace('px', '') - 0,
            height : firstChild.getAttribute('height').replace('px', '') - 0
        };
    }
    
    function geoJson2Path(root, transform) {
        var scale = [transform.scale.x, transform.scale.y];
        var pathArray = [];
        function _getShape(root) {
            if (root.tagName == 'path') {
                // TODO:各种svg！！
                var path = root.getAttribute('d');
                var rect = PathShape.prototype.getRect({path : path});
                pathArray.push({
                    path : path,
                    scale : scale,
                    cp : [
                        (rect.x + rect.width / 2) * scale[0], 
                        (rect.y + rect.height / 2) * scale[1]
                    ],
                    id : root.id,
                    properties : {
                        name : root.getAttribute('name') || ''
                    }
                });
            }
            var shapes = root.childNodes;
            for (var i = 0, len = shapes.length; i < len; i++) {
                _getShape(shapes[i]);
            }
        }
        _getShape(root);
        return pathArray;
    }

    /**
     * 平面坐标转经纬度
     * @param {Array} p
     */
    function pos2geo(obj, p) {
        var point = p instanceof Array ? [p[0] * 1, p[1] * 1] : [p.x * 1, p.y * 1]
        return [point[0] / obj.scale.x, point[1] / obj.scale.y];
    }
    
    /**
     * 经纬度转平面坐标
     * @param {Array | Object} p
     */
    function geo2pos(obj, p) {
        var point = p instanceof Array ? [p[0] * 1, p[1] * 1] : [p.x * 1, p.y * 1]
        return [point[0] * obj.scale.x, point[1] * obj.scale.y];
    }
    
    return {
        getBbox : getBbox,
        geoJson2Path : geoJson2Path,
        pos2geo : pos2geo,
        geo2pos : geo2pos
    };
}); 