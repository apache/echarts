import seedrandom from 'seedrandom';
import lolex from 'lolex';

// const NativeDate = window.Date;

// const fixedTimestamp = 1566458693300;
// const actualTimestamp = NativeDate.now();
// function MockDate(params) {
//     if (!params) {
//         const elapsedTime = NativeDate.now() - actualTimestamp;
//         return new NativeDate(fixedTimestamp + elapsedTime);
//     }
//     else {
//         return new NativeDate(params);
//     }
// }
// MockDate.prototype = new Date();
// // Fixed date
// window.Date = MockDate;

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
