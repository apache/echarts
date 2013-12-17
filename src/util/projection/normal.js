/**
 * echarts地图一般投射算法
 * modify from GeoMap v0.5.3 https://github.com/x6doooo/GeoMap
 * 
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function() {
    function getBbox(json) {
        if (!json.srcSize) {
            parseSrcSize(json);
        }
        
        return json.srcSize;
    }
    
    function parseSrcSize(json) {
        convertor_parse.xmin = 360;
        convertor_parse.xmax = 0;
        convertor_parse.ymin = 180;
        convertor_parse.ymax = 0;

        var shapes = json.features;
        var geometries;
        var shape;
        for (var i = 0, len = shapes.length; i < len; i++) {
            shape = shapes[i];
            if (shape.type == 'Feature') {
                convertor_parse[shape.geometry.type](
                    shape.geometry.coordinates
                );
            } 
            else if (shape.type = 'GeometryCollection') {
                geometries = shape.geometries;
                for (var j = 0, len2 = geometries.length; j < len2; j++) {
                    convertor_parse[geometries[j].type](
                        geometries[j].coordinates
                    );
                }
            }
        }

        json.srcSize = {
            left : convertor_parse.xmin.toFixed(4)*1,
            top : convertor_parse.ymin.toFixed(4)*1,
            width : (convertor_parse.xmax - convertor_parse.xmin).toFixed(4)*1,
            height : (convertor_parse.ymax - convertor_parse.ymin).toFixed(4)*1
        };

        return json;
    }

    var convertor = {
        //调整Alaska到右侧
        'formatPoint' : function(p) {
            return [(p[0] < -168.5 ? p[0] + 360 : p[0]) + 170, 90 - p[1]];
        },
        'makePoint' : function(p) {
            var self = this;
            // for cp
            if (self._bbox.xmin > p[0]) { self._bbox.xmin = p[0]; }
            if (self._bbox.xmax < p[0]) { self._bbox.xmax = p[0]; }
            if (self._bbox.ymin > p[1]) { self._bbox.ymin = p[1]; }
            if (self._bbox.ymax < p[1]) { self._bbox.ymax = p[1]; }
            
            var point = self.formatPoint(p);
            var x = (point[0] - convertor.offset.x) * convertor.scale.x;
            var y = (point[1] - convertor.offset.y) * convertor.scale.y;
            return [x, y];
        },
        'Point' : function(coordinates) {
            coordinates = this.makePoint(coordinates);
            return coordinates.join(',');
        },
        'LineString' : function(coordinates) {
            var str = '';
            var point;
            for (var i = 0, len = coordinates.length; i < len; i++) {
                point = convertor.makePoint(coordinates[i]);
                if (i == 0) {
                    str = 'M' + point.join(',');
                } else {
                    str = str + 'L' + point.join(',');
                }
            }
            return str;
        },
        'Polygon' : function(coordinates) {
            var str = '';
            for (var i = 0, len = coordinates.length; i < len; i++) {
                str = str + convertor.LineString(coordinates[i]) + 'z';
            }
            return str;
        },
        'MultiPoint' : function(coordinates) {
            var arr = [];
            for (var i = 0, len = coordinates.length; i < len; i++) {
                arr.push(convertor.Point(coordinates[i]));
            }
            return arr;
        },
        'MultiLineString' : function(coordinates) {
            var str = '';
            for (var i = 0, len = coordinates.length; i < len; i++) {
                str += convertor.LineString(coordinates[i]);
            }
            return str;
        },
        'MultiPolygon' : function(coordinates) {
            var str = '';
            for (var i = 0, len = coordinates.length; i < len; i++) {
                str += convertor.Polygon(coordinates[i]);
            }
            return str;
        }
    };
    
    var convertor_parse = {
        'formatPoint' : convertor.formatPoint,
        'makePoint' : function(p) {
            var self = this;
            var point = self.formatPoint(p);
            var x = point[0];
            var y = point[1];
            if (self.xmin > x) { self.xmin = x; }
            if (self.xmax < x) { self.xmax = x; }
            if (self.ymin > y) { self.ymin = y; }
            if (self.ymax < y) { self.ymax = y; }
        },
        'Point' : function(coordinates) {
            this.makePoint(coordinates);
        },
        'LineString' : function(coordinates) {
            for (var i = 0, len = coordinates.length; i < len; i++) {
                this.makePoint(coordinates[i]);
            }
        },
        'Polygon' : function(coordinates) {
            for (var i = 0, len = coordinates.length; i < len; i++) {
                this.LineString(coordinates[i]);
            }
        },
        'MultiPoint' : function(coordinates) {
            for (var i = 0, len = coordinates.length; i < len; i++) {
                this.Point(coordinates[i]);
            }
        },
        'MultiLineString' : function(coordinates) {
            for (var i = 0, len = coordinates.length; i < len; i++) {
                this.LineString(coordinates[i]);
            }
        },
        'MultiPolygon' : function(coordinates) {
            for (var i = 0, len = coordinates.length; i < len; i++) {
                this.Polygon(coordinates[i]);
            }
        }
    };

    function geoJson2Path(json, obj) {
        convertor.scale = null;
        convertor.offset = null;

        if ((!obj.scale || !obj.offset) && !json.srcSize) {
            parseSrcSize(json);
        }
        
        obj.offset = {
            x : json.srcSize.left,
            y : json.srcSize.top
        };

        convertor.scale = obj.scale;
        convertor.offset = obj.offset;
        
        var shapes = json.features;
        var geometries;
        var pathArray = [];
        var val;
        var shape;
        for (var i = 0, len = shapes.length; i < len; i++) {
            shape = shapes[i];
            if (shape.type == 'Feature') {
                pushApath(shape.geometry, shape);
            } 
            else if (shape.type = 'GeometryCollection') {
                geometries = shape.geometries;
                for (var j = 0, len2 = geometries.length; j < len2; j++) {
                    val = geometries[j];
                    pushApath(val, val);
                }
            }
        }
        
        var shapeType;
        var shapeCoordinates;
        var str;
        function pushApath(gm, shape) {
            shapeType = gm.type;
            shapeCoordinates = gm.coordinates;
            convertor._bbox = {
                xmin : 360,
                xmax : 0,
                ymin : 180,
                ymax : 0
            };
            str = convertor[shapeType](shapeCoordinates);
            pathArray.push({
                //type : shapeType,
                path : str,
                cp : shape.properties.cp
                     ? convertor.makePoint(shape.properties.cp)
                     : convertor.makePoint([
                            (convertor._bbox.xmin + convertor._bbox.xmax) / 2,
                            (convertor._bbox.ymin + convertor._bbox.ymax) / 2
                       ]),
                properties : shape.properties,
                id : shape.id
            });
        }

        return pathArray;
    }

    /**
     * 平面坐标转经纬度
     * @param {Array} p
     */
    function pos2geo(obj, p) {
        var x = p[0] * 1;
        var y = p[1] * 1;
        x = x / obj.scale.x + obj.offset.x - 170;
        x = x > 180 ? x - 360 : x;
        y = 90 - (y / obj.scale.y + obj.offset.y);
        return [x, y];
    }
    
    /**
     * 经纬度转平面坐标
     * @param {Array | Object} p
     */
    function geo2pos(obj, p) {
        convertor.offset = obj.offset;
        convertor.scale = obj.scale;
        return p instanceof Array
               ? convertor.makePoint([p[0] * 1, p[1] * 1])
               : convertor.makePoint([p.x * 1, p.y * 1]);
    }
    
    return {
        getBbox : getBbox,
        geoJson2Path : geoJson2Path,
        pos2geo : pos2geo,
        geo2pos : geo2pos
    };
}); 