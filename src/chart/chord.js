import * as echarts from '../echarts';

import './chord/ChordSeries';
import './chord/ChordView';

import chordCircularLayout from './chord/chordCircularLayout';
import dataColor from '../visual/dataColor';
import dataFilter from '../processor/dataFilter';

echarts.registerLayout(chordCircularLayout);
echarts.registerVisual(dataColor('chord'));
echarts.registerProcessor(dataFilter('pie'));