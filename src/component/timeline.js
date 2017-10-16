/**
 * DataZoom component entry
 */

import * as echarts from '../echarts';
import preprocessor from './timeline/preprocessor';

import './timeline/typeDefaulter';
import './timeline/timelineAction';
import './timeline/SliderTimelineModel';
import './timeline/SliderTimelineView';

echarts.registerPreprocessor(preprocessor);
