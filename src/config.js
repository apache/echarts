// (1) The code `if (__DEV__) ...` can be removed by build tool.
// (2) If intend to use `__DEV__`, this module should be imported. Use a global
// variable `__DEV__` may cause that miss the declaration (see #6535), or the
// declaration is behind of the using position (for example in `Model.extent`,
// And tools like rollup can not analysis the dependency if not import).

var dev;

// In browser
if (typeof window !== 'undefined') {
    dev = window.__DEV__;
}
// In node
else if (typeof global !== 'undefined') {
    dev = global.__DEV__;
}

if (typeof dev === 'undefined') {
    dev = true;
}

export var __DEV__ = dev;
