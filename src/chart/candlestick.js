import * as echarts from '../echarts';

import './candlestick/CandlestickSeries';
import './candlestick/CandlestickView';
import preprocessor from './candlestick/preprocessor';

import candlestickVisual from './candlestick/candlestickVisual';
import candlestickLayout from './candlestick/candlestickLayout';

echarts.registerPreprocessor(preprocessor);
echarts.registerVisual(candlestickVisual);
echarts.registerLayout(candlestickLayout);
