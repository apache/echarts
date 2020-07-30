
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
            "all": "Kaikki",
            "inverse": "Käänteinen"
        }
    },
    "toolbox": {
        "brush": {
            "title": {
                "rect": "Laatikko valinta",
                "polygon": "Lasso valinta",
                "lineX": "Vaakataso valinta",
                "lineY": "Pysty valinta",
                "keep": "Pidä valinta",
                "clear": "Poista valinta"
            }
        },
        "dataView": {
            "title": "Data näkymä",
            "lang": [
                "Data näkymä",
                "Sulje",
                "Päivitä"
            ]
        },
        "dataZoom": {
            "title": {
                "zoom": "Zoomaa",
                "back": "Zoomin nollaus"
            }
        },
        "magicType": {
            "title": {
                "line": "Vaihda Viivakaavioon",
                "bar": "Vaihda palkkikaavioon",
                "stack": "Pinoa",
                "tiled": "Erottele"
            }
        },
        "restore": {
            "title": "Palauta"
        },
        "saveAsImage": {
            "title": "Tallenna kuvana",
            "lang": [
                "Paina oikeaa hiirennappia tallentaaksesi kuva"
            ]
        }
    }
}

        echarts.registerLocale('FI', lang);
        
});