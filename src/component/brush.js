/**
 * Brush component entry
 */

import * as echarts from '../echarts';
import preprocessor from './brush/preprocessor';

import './brush/visualEncoding';
import './brush/BrushModel';
import './brush/BrushView';
import './brush/brushAction';
import './toolbox/feature/Brush';

echarts.registerPreprocessor(preprocessor);