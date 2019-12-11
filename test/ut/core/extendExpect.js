
const utHelper = require('./utHelper');

// Setup expectes
expect.extend({
    toBeFinite(received) {
        const passed = utHelper.isValueFinite(received);
        return {
            message: passed
                ? () => `expected ${received} not to be finite`
                : () => `expected ${received} to be finite`,
            pass: passed
        };
    },

    // Greater than or equal
    toBeGeaterThanOrEqualTo(received, bound) {
        const passed = received >= bound;
        return {
            message: passed
                ? () => `expected ${received} to be less than or equal to ${bound}`
                : () => `expected ${received} to be greater than or equal to ${bound}`,
            pass: passed
        };
    },

    // Greater than
    toBeGreaterThan(received, bound) {
        const passed = received > bound;
        return {
            message: passed
                ? () => `expected ${received} to be less than ${bound}`
                : () => `expected ${received} to be greater than ${bound}`,
            pass: passed
        };
    },

    toBeEmptyArray(received) {
        const passed = received.length === 0;
        return {
            message: passed
                ? () => `expected ${received} not to be an empty array`
                : () => `expected ${received} to be an empty array`,
            pass: passed
        };
    }
});
