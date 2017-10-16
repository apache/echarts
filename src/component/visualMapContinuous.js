/**
 * DataZoom component entry
 */

import * as echarts from '../echarts';
import preprocessor from './visualMap/preprocessor';

import './visualMap/typeDefaulter';
import './visualMap/visualEncoding';
import './visualMap/ContinuousModel';
import './visualMap/ContinuousView';
import './visualMap/visualMapAction';

echarts.registerPreprocessor(preprocessor);
