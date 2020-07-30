
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'echarts'], factory);
    } else if (
        typeof exports === 'object' &&
        typeof exports.nodeName !== 'string'
    ) {
        // CommonJS
        factory(exports, require('echarts'));
    } else {
        // Browser globals
        factory({}, root.echarts);
    }
})(this, function(exports, echarts) {
var lang ={
    "legend": {
        "selector": {
            "all": "Todas",
            "inverse": "Inversa"
        }
    },
    "toolbox": {
        "brush": {
            "title": {
                "rect": "Selección de cuadro",
                "polygon": "Selección de lazo",
                "lineX": "Seleccionar horizontalmente",
                "lineY": "Seleccionar verticalmente",
                "keep": "Mantener selección",
                "clear": "Despejar selecciones"
            }
        },
        "dataView": {
            "title": "Ver datos",
            "lang": [
                "Ver datos",
                "Cerrar",
                "Actualizar"
            ]
        },
        "dataZoom": {
            "title": {
                "zoom": "Zoom",
                "back": "Restablecer zoom"
            }
        },
        "magicType": {
            "title": {
                "line": "Cambiar a gráfico de líneas",
                "bar": "Cambiar a gráfico de barras",
                "stack": "Pila",
                "tiled": "Teja"
            }
        },
        "restore": {
            "title": "Restaurar"
        },
        "saveAsImage": {
            "title": "Guardar como imagen",
            "lang": [
                "Clic derecho para guardar imagen"
            ]
        }
    }
}

        echarts.registerLocale('ES', lang);
        
});