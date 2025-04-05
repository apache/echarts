

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
        define(['exports', 'echarts'], factory);
    } else if (
        typeof exports === 'object' &&
        typeof exports.nodeName !== 'string'
    ) {
        // CommonJS
        factory(exports, require('echarts/lib/echarts'));
    } else {
        // Browser globals
        factory({}, root.echarts);
    }
})(this, function(exports, echarts) {


/**
 * Language: Swedish.
 */

var localeObj = {
    time: {
      month: [
        'januari', 'februari', 'mars', 'april', 'maj', 'juni',
        'juli', 'augusti', 'september', 'oktober', 'november', 'december',
      ],
      monthAbbr: [
        'jan', 'feb', 'mar', 'apr', 'maj', 'jun',
        'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
      ],
      dayOfWeek: [
        'söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag',
      ],
      dayOfWeekAbbr: [
        'sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör',
      ],
    },
    legend: {
      selector: {
        all: 'Alla',
        inverse: 'Omvänd',
      },
    },
    toolbox: {
      brush: {
        title: {
          rect: 'Rektangelurval',
          polygon: 'Lassomarkering',
          lineX: 'Vågrätt urval',
          lineY: 'Lodrätt urval',
          keep: 'Behåll urval',
          clear: 'Rensa urval',
        },
      },
      dataView: {
        title: 'Datavy',
        lang: ['Datavy', 'Stäng', 'Uppdatera'],
      },
      dataZoom: {
        title: {
          zoom: 'Zooma',
          back: 'Återställ zoom',
        },
      },
      magicType: {
        title: {
          line: 'Byt till linjediagram',
          bar: 'Byt till stapeldiagram',
          stack: 'Stapla',
          tiled: 'Sida vid sida',
        },
      },
      restore: {
        title: 'Återställ',
      },
      saveAsImage: {
        title: 'Spara som bild',
        lang: ['Högerklicka för att spara bild'],
      },
    },
    series: {
      typeNames: {
        pie: 'Cirkeldiagram',
        bar: 'Stapeldiagram',
        line: 'Linjediagram',
        scatter: 'Punktdiagram',
        effectScatter: 'Punktdiagram med rippeleffekt',
        radar: 'Radardiagram',
        tree: 'Träd',
        treemap: 'Trädkarta',
        boxplot: 'Lådagram',
        candlestick: 'Candlestick',
        k: 'K-linjediagram',
        heatmap: 'Värmekarta',
        map: 'Karta',
        parallel: 'Parallella koordinater',
        lines: 'Linjediagram',
        graph: 'Relationsgraf',
        sankey: 'Sankeydiagram',
        funnel: 'Trattdiagram',
        gauge: 'Mätare',
        pictorialBar: 'Bildstapel',
        themeRiver: 'Tematisk flod',
        sunburst: 'Solburstdiagram',
        custom: 'Anpassat',
        chart: 'Diagram',
      },
    },
    aria: {
      general: {
        withTitle: 'Detta är ett diagram om "{title}"',
        withoutTitle: 'Detta är ett diagram',
      },
      series: {
        single: {
          prefix: '',
          withName: ' med typnamn {name}.',
          withoutName: ' med typ {seriesType}.',
        },
        multiple: {
          prefix: '. Det består av {seriesCount} serier.',
          withName: ' Serien {seriesId} är en {seriesType} som representerar {seriesName}.',
          withoutName: ' Serien {seriesId} är en {seriesType}.',
          separator: {
            middle: '',
            end: '',
          },
        },
      },
      data: {
        allData: 'Data är som följer: ',
        partialData: 'De första {displayCnt} objekten är: ',
        withName: 'datavärdet för {name} är {value}',
        withoutName: '{value}',
        separator: {
          middle: ', ',
          end: '. ',
        },
      },
    },
  };
    echarts.registerLocale('SV', localeObj);
        
});