import * as util from './a/b/util';
export var exportSingleVar = 'aa';
var b = util;
export { b };

function SomeDefault() {}

export default SomeDefault;