// (1) The code `if (__DEV__) ...` can be removed by build tool.
// (2) If intend to use `__DEV__`, this module should be imported. Use a global
// variable `__DEV__` may cause that miss the declaration (see #6535), or the
// declaration is behind of the using position (for example in `Model.extent`,
// And tools like rollup can not analysis the dependency if not import).

var __DEV__;

// In browser
if (typeof window !== 'undefined') {
    __DEV__ = window.__DEV__;
}
// In node
else if (typeof global !== 'undefined') {
    __DEV__ = global.__DEV__;
}

if (typeof __DEV__ === 'undefined') {
    __DEV__ = true;
}

export {__DEV__};
