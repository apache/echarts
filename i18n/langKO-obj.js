

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
 * Language: Korean.
 */

var localeObj = {
    time: {
        month: [
            '1월', '2월', '3월', '4월', '5월', '6월',
            '7월', '8월', '9월', '10월', '11월', '12월'
        ],
        monthAbbr: [
            '1월', '2월', '3월', '4월', '5월', '6월',
            '7월', '8월', '9월', '10월', '11월', '12월'
        ],
        dayOfWeek: [
            '일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'
        ],
        dayOfWeekAbbr: [
            '일', '월', '화', '수', '목', '금', '토'
        ]
    },
    legend: {
        selector: {
            all: '모두 선택',
            inverse: '선택 범위 반전'
        }
    },
    toolbox: {
        brush: {
            title: {
                rect: '사각형 선택',
                polygon: '올가미 선택',
                lineX: '수평 선택',
                lineY: '수직 선택',
                keep: '선택 유지',
                clear: '선택 지우기'
            }
        },
        dataView: {
            title: '날짜 보기',
            lang: ['날짜 보기', '닫기', '새로 고침']
        },
        dataZoom: {
            title: {
                zoom: '확대/축소',
                back: '확대/축소 초기화'
            }
        },
        magicType: {
            title: {
                line: '꺽은선 그래프로 변경',
                bar: '막대 그래프로 변경',
                stack: '스택',
                tiled: '타일'
            }
        },
        restore: {
            title: '복구'
        },
        saveAsImage: {
            title: '이미지로 저장',
            lang: ['이미지를 저장하려면 마우스 오른쪽 버튼을 클릭하세요.']
        }
    },
    series: {
        typeNames: {
            pie: '원 그래프',
            bar: '막대 그래프',
            line: '꺽은선 그래프',
            scatter: '산점도',
            effectScatter: '물결 효과 산점도',
            radar: '방사형 그래프',
            tree: '트리',
            treemap: '트리맵',
            boxplot: '상자 수염 그래프',
            candlestick: '캔들스틱 차트',
            k: 'K 라인 차트',
            heatmap: '히트 맵',
            map: '지도',
            parallel: '평행 좌표 맵',
            lines: '선',
            graph: '관계 그래프',
            sankey: '산키 다이어그램',
            funnel: '깔때기형 그래프',
            gauge: '계기',
            pictorialBar: '픽토그램 차트',
            themeRiver: '스트림 그래프',
            sunburst: '선버스트 차트',
            custom: '맞춤 차트',
            chart: '차트'
        }
    },
    aria: {
        general: {
            withTitle: '"{title}"에 대한 차트입니다.',
            withoutTitle: '차트입니다.'
        },
        series: {
            single: {
                prefix: '',
                withName: ' 차트 유형은 {seriesType}이며 {seriesName}을 표시합니다.',
                withoutName: ' 차트 유형은 {seriesType}입니다.'
            },
            multiple: {
                prefix: '. {seriesCount} 하나의 차트 시리즈로 구성됩니다.',
                withName: ' {seriesId}번째 시리즈는 {seriesName}을 나타내는 {seriesType} representing.',
                withoutName: ' {seriesId}번째 시리즈는 {seriesType}입니다.',
                separator: {
                    middle: '',
                    end: ''
                }
            }
        },
        data: {
            allData: '데이터: ',
            partialData: '첫번째 {displayCnt} 아이템: ',
            withName: '{name}의 데이터는 {value}',
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