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
 * Language: Türkçe.
 */

export default {
    time: {
        month: [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ],
        monthAbbr: [
            'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
            'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
        ],
        dayOfWeek: [
            'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
        ],
        dayOfWeekAbbr: [
            'Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'
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
                clear: 'Seçimi Temizle'
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
                line: 'Çizgi Grafiğe Geç',
                bar: 'Çubuk Grafiğe Geç',
                stack: 'Yığılmış',
                tiled: 'Yan Yana'
            }
        },
        restore: {
            title: 'Eski Haline Getir'
        },
        saveAsImage: {
            title: 'Resim Olarak Kaydet',
            lang: ['Resim olarak kaydetmek için sağ tıklayın']
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
            candlestick: 'Mum Grafiği',
            k: 'K Çizgi Grafiği',
            heatmap: 'Isı Haritası',
            map: 'Harita',
            parallel: 'Paralel Koordinat Grafiği',
            lines: 'Çizgisel Grafik',
            graph: 'İlişkisel Grafik',
            sankey: 'Sankey Diyagramı',
            funnel: 'Huni Grafiği',
            gauge: 'Gösterge',
            pictorialBar: 'Resimli Çubuk Grafiği',
            themeRiver: 'Akış Haritası',
            sunburst: 'Güneş Patlaması Grafiği',
            custom: 'Özel Grafik',
            chart: 'Grafik'
        }
    },
    aria: {
        general: {
            withTitle: 'Bu, "{title}" hakkında bir grafiktir',
            withoutTitle: 'Bu bir grafiktir'
        },
        series: {
            single: {
                prefix: '',
                withName: '. Türü {seriesType}, adı {seriesName}.',
                withoutName: '. Türü {seriesType}.'
            },
            multiple: {
                prefix: '. {seriesCount} seriden oluşur.',
                withName: ' {seriesId}. seri, {seriesName} adlı bir {seriesType}.',
                withoutName: ' {seriesId}. seri bir {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: ' Veriler şöyle: ',
            partialData: ' İlk {displayCnt} öğe: ',
            withName: '{name} verisi {value}',
            withoutName: '{value}',
            separator: {
                middle: ', ',
                end: '. '
            }
        }
    }
};
