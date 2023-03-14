

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
 * Language: Vietnamese.
 */

var localeObj = {
  time: {
    month: [
      'Tháng 1',
      'Tháng 2',
      'Tháng 3',
      'Tháng 4',
      'Tháng 5',
      'Tháng 6',
      'Tháng 7',
      'Tháng 8',
      'Tháng 9',
      'Tháng 10',
      'Tháng 11',
      'Tháng 12'
    ],
    monthAbbr: [
      'Th01',
      'Th02',
      'Th03',
      'Th04',
      'Th05',
      'Th06',
      'Th07',
      'Th08',
      'Th09',
      'Th10',
      'Th11',
      'Th12'
    ],
    dayOfWeek: [
      'Chủ nhật',
      'Thứ hai',
      'Thứ ba',
      'Thứ tư',
      'Thứ năm',
      'Thứ sáu',
      'Thứ bảy'
    ],
    dayOfWeekAbbr: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  },
  legend: {
    selector: {
      all: 'Tất cả',
      inverse: 'Ngược lại'
    }
  },
  toolbox: {
    brush: {
      title: {
        rect: 'Chọn theo ô',
        polygon: 'Chọn theo đường bất kỳ',
        lineX: 'Chọn theo chiều ngang',
        lineY: 'Chọn theo chiều dọc',
        keep: 'Giữ đã chọn',
        clear: 'Bỏ đã chọn'
      }
    },
    dataView: {
      title: 'Xem dữ liệu',
      lang: ['Xem dữ liệu', 'Đóng', 'Làm mới']
    },
    dataZoom: {
      title: {
        zoom: 'Phóng to',
        back: 'Bỏ phóng to'
      }
    },
    magicType: {
      title: {
        line: 'Chuyển sang biểu đồ đường',
        bar: 'Chuyển sang biểu đồ cột',
        stack: 'Xếp chồng',
        tiled: 'Lát'
      }
    },
    restore: {
      title: 'Khôi phục'
    },
    saveAsImage: {
      title: 'Lưu thành ảnh',
      lang: ['Bấm phải chuột để lưu ảnh']
    }
  },
  series: {
    typeNames: {
      pie: 'Biều đồ tròn',
      bar: 'Biểu đồ cột',
      line: 'Biểu đồ đường',
      scatter: 'Biểu đồ phân tán',
      effectScatter: 'Biểu đồ gợn sóng',
      radar: 'Biểu đồ Radar',
      tree: 'Biểu đồ cây',
      treemap: 'Sơ đồ cây',
      boxplot: 'Biểu đồ hộp',
      candlestick: 'Biều đồ nến',
      k: 'Biểu đồ đường K',
      heatmap: 'Bản đồ nhiệt',
      map: 'Bản đồ',
      parallel: 'Bản đồ tọa độ song song',
      lines: 'Biểu đồ đường',
      graph: 'Đồ thị quan hệ',
      sankey: 'Sơ đồ dòng',
      funnel: 'Biểu đồ hình phễu',
      gauge: 'Biểu đồ cung tròn',
      pictorialBar: 'Biểu diễn hình ảnh',
      themeRiver: 'Bản đồ sông',
      sunburst: 'Biểu đồ bậc'
    }
  },
  aria: {
    general: {
      withTitle: 'Đây là biểu đồ "{title}"',
      withoutTitle: 'Đây là biểu đồ'
    },
    series: {
      single: {
        prefix: '',
        withName: ' với kiểu {seriesType} tên là {seriesName}.',
        withoutName: ' với kiểu {seriesType}.'
      },
      multiple: {
        prefix: '. Nó bao gồm {seriesCount} chuỗi.',
        withName:
          ' Chuỗi {seriesId} có kiểu {seriesType} đại diện cho {seriesName}.',
        withoutName: ' Chuỗi {seriesId} có kiểu {seriesType}.',
        separator: {
          middle: '',
          end: ''
        }
      }
    },
    data: {
      allData: 'Dữ liệu như sau: ',
      partialData: 'Các mục {displayCnt} đầu tiên là: ',
      withName: 'dữ liệu cho {name} là {value}',
      withoutName: '{value}',
      separator: {
        middle: ', ',
        end: '. '
      }
    }
  }
};

    echarts.registerLocale('VI', localeObj);
        
});