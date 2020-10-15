

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


/**
 * AUTO-GENERATED FILE. DO NOT MODIFY.
 */
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


var localeObj = {
    time: {
        month: [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ],
        monthAbbr: [
            'ene', 'feb', 'mar', 'abr', 'may', 'jun',
            'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
        ],
        dayOfWeek: [
            'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
        ],
        dayOfWeekAbbr: [
            'dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sáb'
        ]
    },
    legend: {
        selector: {
            all: 'Todas',
            inverse: 'Inversa'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Selección de cuadro',
                polygon: 'Selección de lazo',
                lineX: 'Seleccionar horizontalmente',
                lineY: 'Seleccionar verticalmente',
                keep: 'Mantener selección',
                clear: 'Despejar selecciones'
            }
        },
        dataView: {
            title: 'Ver datos',
            lang: ['Ver datos', 'Cerrar', 'Actualizar']
        },
        dataZoom: {
            title: {
                zoom: 'Zoom',
                back: 'Restablecer zoom'
            }
        },
        magicType: {
            title: {
                line: 'Cambiar a gráfico de líneas',
                bar: 'Cambiar a gráfico de barras',
                stack: 'Pila',
                tiled: 'Teja'
            }
        },
        restore: {
            title: 'Restaurar'
        },
        saveAsImage: {
            title: 'Guardar como imagen',
            lang: ['Clic derecho para guardar imagen']
        }
    }
};

    for (var key in localeObj) {
        if (localeObj.hasOwnProperty(key)) {
            exports[key] = localeObj[key];
        }
    }
        
});