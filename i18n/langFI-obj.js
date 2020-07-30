
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports'], factory);
    } else if (
        typeof exports === 'object' &&
        typeof exports.nodeName !== 'string'
    ) {
        // CommonJS
        factory(exports);
    } else {
        // Browser globals
        factory({});
    }
})(this, function(exports) {
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

            exports.lang = lang;
        
});