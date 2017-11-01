
// Enable DEV mode when using source code without build. which has no __DEV__ variable
// In build process 'typeof __DEV__' will be replace with 'boolean'
// So this code will be removed or disabled anyway after built.
if (typeof __DEV__ === 'undefined') {
    // In browser
    if (typeof window !== 'undefined') {
        window.__DEV__ = true;
    }
    // In node
    else if (typeof global !== 'undefined') {
        global.__DEV__ = true;
    }
}
