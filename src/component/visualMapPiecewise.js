/**
 * DataZoom component entry
 */

import * as echarts from '../echarts';
import preprocessor from './visualMap/preprocessor';

import './visualMap/typeDefaulter';
import './visualMap/visualEncoding';
import './visualMap/PiecewiseModel';
import './visualMap/PiecewiseView';
import './visualMap/visualMapAction';

echarts.registerPreprocessor(preprocessor);
