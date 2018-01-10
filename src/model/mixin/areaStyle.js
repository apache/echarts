import makeStyleMapper from './makeStyleMapper';

var getAreaStyle = makeStyleMapper(
    [
        ['fill', 'color'],
        ['shadowBlur'],
        ['shadowOffsetX'],
        ['shadowOffsetY'],
        ['opacity'],
        ['shadowColor']
    ]
);

export default {
    getAreaStyle: function (excludes, includes) {
        return getAreaStyle(this, excludes, includes);
    }
};