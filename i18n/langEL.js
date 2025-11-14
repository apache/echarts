

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
 * Language: Greek.
 */

var localeObj = {
    time: {
        month: [
            'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
            'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
        ],
        monthAbbr: [
            'Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαϊ', 'Ιουν',
            'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'
        ],
        dayOfWeek: [
            'Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'
        ],
        dayOfWeekAbbr: [
            'Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'
        ]
    },
    legend: {
        selector: {
            all: 'Όλα',
            inverse: 'Αντιστροφή'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: 'Επιλογή με πλαίσιο',
                polygon: 'Επιλογή με λάσο',
                lineX: 'Οριζόντια επιλογή',
                lineY: 'Κατακόρυφη επιλογή',
                keep: 'Διατήρηση επιλογών',
                clear: 'Καθαρισμός επιλογών'
            }
        },
        dataView: {
            title: 'Προβολή δεδομένων',
            lang: ['Προβολή δεδομένων', 'Κλείσιμο', 'Ανανένωση']
        },
        dataZoom: {
            title: {
                zoom: 'Μεγέθυνση',
                back: 'Επαναφορά μεγέθυνσης'
            }
        },
        magicType: {
            title: {
                line: 'Αλλαγή σε γραμμικό διάγραμμα',
                bar: 'Αλλαγή σε ραβδογράφημα',
                stack: 'Στοίβα',
                tiled: 'Πλακίδια'
            }
        },
        restore: {
            title: 'Επαναφορά'
        },
        saveAsImage: {
            title: 'Αποθήκευση ως εικόνα',
            lang: ['Δεξί κλικ για αποθήκευση εικόνας']
        }
    },
    series: {
        typeNames: {
            pie: 'Γράφημα πίτας',
            bar: 'Ραβδογράφημα',
            line: 'Γραμμικό διάγραμμα',
            scatter: 'Διάγραμμα διασποράς',
            effectScatter: 'Διάγραμμα διασποράς με κυματισμό',
            radar: 'Διάγραμμα ραντάρ',
            tree: 'Δενδρόγραμμα',
            treemap: 'Διάγραμμα διαμερισματοποίησης',
            boxplot: 'Γράφημα πλαισίου-απολήξεων',
            candlestick: 'Διάγραμμα κηροπηγίων',
            k: 'Διάγραμμα Κ',
            heatmap: 'Θερμικός χάρτης',
            map: 'Χάρτης',
            parallel: 'Χάρτης παράλληλων συντεταγμένων',
            lines: 'Γράφημα γραμμών',
            graph: 'Γράφος σχέσεων',
            sankey: 'Διάγραμμα Sankey',
            funnel: 'Διάγραμμα χωνιού',
            gauge: 'Διάγραμμα μετρητή',
            pictorialBar: 'Εικονογραφικό ραβδογράφημα',
            themeRiver: 'Γράφημα Ροής Κατηγοριών',
            sunburst: 'Γράφημα Ιεραρχικών Δακτυλίων',
            custom: 'Προσαρμοσμένο διάγραμμα',
            chart: 'Διάγραμμα'
        }
    },
    aria: {
        general: {
            withTitle: 'Αυτό είναι ένα διάγραμμα με τίτλο "{title}"',
            withoutTitle: 'Αυτό είναι ένα διάγραμμα'
        },
        series: {
            single: {
                prefix: '',
                withName: ' με τύπο {seriesType} και όνομα {seriesName}.',
                withoutName: ' με τύπο {seriesType}.'
            },
            multiple: {
                prefix: '. Αποτελείται από {seriesCount} σειρές δεδομένων.',
                withName: ' Η σειρά {seriesId} είναι {seriesType} με όνομα {seriesName}.',
                withoutName: ' Η σειρά {seriesId} είναι {seriesType}.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: 'Τα δεδομένα είναι τα εξής:',
            partialData: 'Τα πρώτα {displayCnt} στοιχεία είναι: ',
            withName: 'τα δεδομένα για {name} είναι {value}',
            withoutName: '{value}',
            separator: {
                middle: ', ',
                end: '. '
            }
        }
    }
};

    echarts.registerLocale('EL', localeObj);
        
});