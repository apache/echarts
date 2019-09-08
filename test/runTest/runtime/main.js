import seedrandom from 'seedrandom';
import lolex from 'lolex';

if (typeof __TEST_PLAYBACK_SPEED__ === 'undefined') {
    window.__TEST_PLAYBACK_SPEED__ = 1;
}

// Mock date.
const NativeDate = window.Date;

const fixedTimestamp = 1566458693300;
const actualTimestamp = NativeDate.now();
const mockNow = function () {
    // speed up
    return fixedTimestamp + (NativeDate.now() - actualTimestamp) * window.__TEST_PLAYBACK_SPEED__;
};
function MockDate(...args) {
    if (!args.length) {
        return new NativeDate(mockNow());
    }
    else {
        return new NativeDate(...args);
    }
}
MockDate.prototype = Object.create(NativeDate.prototype);
Object.setPrototypeOf(MockDate, NativeDate);
MockDate.now = mockNow;

window.Date = MockDate;


let myRandom = new seedrandom('echarts-test');
// Fixed random generator
Math.random = function () {
    const val = myRandom();
    return val;
};

// lolex.install({
//     shouldAdvanceTime: true,
//     advanceTimeDelta: 200,
//     now: fixedTimestamp
// });
