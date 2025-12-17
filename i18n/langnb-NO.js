

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
 * Language: Norwegian Bokmål.
 */

var localeObj = {
  time: {
    month: [
      'januar', 'februar', 'mars', 'april', 'mai', 'juni',
      'juli', 'august', 'september', 'oktober', 'november', 'desember',
    ],
    monthAbbr: [
      'jan', 'feb', 'mar', 'apr', 'mai', 'jun',
      'jul', 'aug', 'sep', 'okt', 'nov', 'des',
    ],
    dayOfWeek: [
      'søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag',
    ],
    dayOfWeekAbbr: ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'],
  },
  legend: {
    selector: {
      all: 'Alle',
      inverse: 'Omvendt',
    },
  },
  toolbox: {
    brush: {
      title: {
        rect: 'Boksutvalg',
        polygon: 'Lassomarkering',
        lineX: 'Vannrett utvalg',
        lineY: 'Loddrett utvalg',
        keep: 'Behold utvalg',
        clear: 'Fjern utvalg',
      },
    },
    dataView: {
      title: 'Datavisning',
      lang: ['Datavisning', 'Lukk', 'Oppfrisk'],
    },
    dataZoom: {
      title: {
        zoom: 'Zoom',
        back: 'Tilbakestill zoom',
      },
    },
    magicType: {
      title: {
        line: 'Bytt til linjediagram',
        bar: 'Bytt til stolpediagram',
        stack: 'Stable',
        tiled: 'Side ved side',
      },
    },
    restore: {
      title: 'Tilbakestill',
    },
    saveAsImage: {
      title: 'Lagre som bilde',
      lang: ['Høyreklikk for å lagre som bilde'],
    },
  },
  series: {
    typeNames: {
      pie: 'Sektordiagram',
      bar: 'Stolpediagram',
      line: 'Linjediagram',
      scatter: 'Spredningsplott',
      effectScatter: 'Krusningsspredningsplott',
      radar: 'Radardiagram',
      tree: 'Tre',
      treemap: 'Trekart',
      boxplot: 'Boksplot',
      candlestick: 'Candlestick',
      k: 'K-linjediagram',
      heatmap: 'Varmekart',
      map: 'Kart',
      parallel: 'Parallelle koordinater',
      lines: 'Linjediagram',
      graph: 'Relasjonsgraf',
      sankey: 'Sankey-diagram',
      funnel: 'Traktdiagram',
      gauge: 'Måler',
      pictorialBar: 'Bildestolper',
      themeRiver: 'Tematisk elvediagram',
      sunburst: 'Solstrålediagram',
      custom: 'Tilpasset',
      chart: 'Diagram',
    },
  },
  aria: {
    general: {
      withTitle: 'Dette er et diagram om "{title}"',
      withoutTitle: 'Dette er et diagram',
    },
    series: {
      single: {
        prefix: '',
        withName: ' med type {seriesType} ved navn {seriesName}.',
        withoutName: ' med type {seriesType}.',
      },
      multiple: {
        prefix: '. Det består av {seriesCount} serier.',
        withName:
          ' Serie {seriesId} er av typen {seriesType} som representerer {seriesName}.',
        withoutName: ' Serie {seriesId} er av typen {seriesType}.',
        separator: {
          middle: '',
          end: '',
        },
      },
    },
    data: {
      allData: 'Dataene er som følger: ',
      partialData: 'De første {displayCnt} elementene er: ',
      withName: 'dataene for {name} er {value}',
      withoutName: '{value}',
      separator: {
        middle: ', ',
        end: '. ',
      },
    },
  },
};

    echarts.registerLocale('nb-NO', localeObj);
        
});