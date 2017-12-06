import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';

import './chord/ChordSeries';
import './chord/ChordView';

import chordCircularLayout from './chord/chordCircularLayout';
import dataColor from '../visual/dataColor';
import dataFilter from '../processor/dataFilter';

echarts.registerLayout(chordCircularLayout);
echarts.registerVisual(zrUtil.curry(dataColor, 'chord'));
echarts.registerProcessor(zrUtil.curry(dataFilter, 'pie'));