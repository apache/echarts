

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


/**
 * Language: Türkçe.
 */

var localeObj = {
    time: {
        month: [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ],
        monthAbbr: [
            'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
            'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'
        ],
        dayOfWeek: [
            'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
        ],
        dayOfWeekAbbr: [
            'Paz', 'Pzt', 'Sal', 'Çrş', 'Prş', 'Cum', 'Cts'
        ]
    },
    legend: {
        selector: {
            all: 'Tümünü Seç',
            inverse: 'Seçimi Ters Çevir'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Dikdörtgen Seçimi',
                polygon: 'Kement Seçimi',
                lineX: 'Yatay Seçim',
                lineY: 'Dikey Seçim',
                keep: 'Seçimi Koru',
                clear: 'Seçimi Sil'
            }
        },
        dataView: {
            title: 'Veri Görünümü',
            lang: ['Veri Görünümü', 'Kapat', 'Yenile']
        },
        dataZoom: {
            title: {
                zoom: 'Yakınlaştır/Uzaklaştır',
                back: 'Yakınlaştırmayı Sıfırla'
            }
        },
        magicType: {
            title: {
                line: 'Çizgisel Grafiğe Çevir',
                bar: 'Çubuk Grafiğe Çevir',
                stack: 'Yığın',
                tiled: 'Blok'
            }
        },
        restore: {
            title: 'Eski Haline Getir'
        },
        saveAsImage: {
            title: 'Resim Olarak Kaydet',
            lang: ['Resim Olarak Kaydetmek için Sağ Tıklayın']
        }
    },
    series: {
        typeNames: {
            pie: 'Pasta Grafiği',
            bar: 'Çubuk Grafik',
            line: 'Çizgi Grafiği',
            scatter: 'Dağılım Grafiği',
            effectScatter: 'Dalga Efekt Dağılım Grafiği',
            radar: 'Radar Grafiği',
            tree: 'Ağaç Grafiği',
            treemap: 'Ağaç Haritası',
            boxplot: 'Kutu Grafiği',
            candlestick: 'Şamdan Grafik',
            k: 'K Çizgi Grafiği',
            heatmap: 'Sıcaklık Haritası',
            map: 'Harita',
            parallel: 'Paralel Koordinat Haritası',
            lines: 'Çizgisel Grafik',
            graph: 'İlişkisel Grafik',
            sankey: 'Sankey Diagramı',
            funnel: 'Huni Grafik',
            gauge: 'Gösterge',
            pictorialBar: 'Resimli Çubuk Grafiği',
            themeRiver: 'Akış Haritası',
            sunburst: 'Güeş Patlaması Tablosu',
            custom: 'Özel grafik',
            chart: 'Grafiği'
        }
    },
    aria: {
        general: {
            withTitle: 'Bu grafik "{title}" içindir.',
            withoutTitle: 'Bu Bir Grafiktir.'
        },
        series: {
            single: {
                prefix: '',
                withName: ' Grafik Türü {seriesType} ve {seriesName} gösteriyor.',
                withoutName: ' {seriesType} tipinde grafik.'
            },
            multiple: {
                prefix: '. {seriesCount} kadar grafik sayısından oluşur.',
                withName: ' {seriesId}.serisi {seriesName} adını temsil eden bir {seriesType} temsil eder.',
                withoutName: ' {seriesId}. serisi bir {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'Veriler Aşağıdaki Gibidir: ',
            partialData: 'İlk {displayCnt} öğesi: ',
            withName: ' {value} için {name}',
            withoutName: '{value}',
            separator: {
                middle: ', ',
                end: '. '
            }
        }
    }
};

    for (var key in localeObj) {
        if (localeObj.hasOwnProperty(key)) {
            exports[key] = localeObj[key];
        }
    }
        
});