
import './chord/ChordSeries';
import './chord/ChordView';

import echarts from '../echarts';
import {util as zrUtil} from 'zrender';

import chordCircularLayout from './chord/chordCircularLayout';
import dataColor from '../visual/dataColor';
import dataFilter from '../processor/dataFilter';

echarts.registerLayout(chordCircularLayout);
echarts.registerVisual(zrUtil.curry(dataColor, 'chord'));
echarts.registerProcessor(zrUtil.curry(dataFilter, 'pie'));