import seedrandom from 'seedrandom';
import './timer';

if (typeof __TEST_PLAYBACK_SPEED__ === 'undefined') {
    window.__TEST_PLAYBACK_SPEED__ = 1;
}

let myRandom = new seedrandom('echarts-test');
// Fixed random generator
Math.random = function () {
    const val = myRandom();
    return val;
};