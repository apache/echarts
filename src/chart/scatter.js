import * as echarts from '../echarts';
// import * as zrUtil from 'zrender/src/core/util';

import './scatter/ScatterSeries';
import './scatter/ScatterView';

import visualSymbol from '../visual/symbol';
import layoutPoints from '../layout/points';

// In case developer forget to include grid component
import '../component/gridSimple';

echarts.registerVisual(visualSymbol('scatter', 'circle'));
echarts.registerLayout(layoutPoints('scatter'));

// echarts.registerProcessor(function (ecModel, api) {
//     ecModel.eachSeriesByType('scatter', function (seriesModel) {
//         var data = seriesModel.getData();
//         var coordSys = seriesModel.coordinateSystem;
//         if (coordSys.type !== 'geo') {
//             return;
//         }
//         var startPt = coordSys.pointToData([0, 0]);
//         var endPt = coordSys.pointToData([api.getWidth(), api.getHeight()]);

//         var dims = zrUtil.map(coordSys.dimensions, function (dim) {
//             return data.mapDimension(dim);
//         });
//         var range = {};
//         range[dims[0]] = [Math.min(startPt[0], endPt[0]), Math.max(startPt[0], endPt[0])];
//         range[dims[1]] = [Math.min(startPt[1], endPt[1]), Math.max(startPt[1], endPt[1])];

//         data.selectRange(range);
//     });
// });