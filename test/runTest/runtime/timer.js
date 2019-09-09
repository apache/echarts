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

