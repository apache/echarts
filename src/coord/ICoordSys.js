/**
 * Coordinate System Interface:
 *
 * Class members:
 *  + dimensions {Array.<strign>}: mandatory
 *
 * Instance members:
 *  + dimensions {Array.<strign>}: mandatory
 *
 *  + dataToPoint {Function}: mandatory
 *      @param {Array.<*>} data
 *      @param {boolean} [clamp=false]
 *      @return {Array.<number>} point Point in global pixel coordinate system.
 *
 *  + pointToData {Function}: mandatory
 *      @param {Array.<number>} point Point in global pixel coordinate system.
 *      @param {boolean} [clamp=false]
 *      @return {Array.<*>} data
 *
 *  + containPoint {Function}: mandatory
 *      @param {Array.<number>} point Point in global pixel coordinate system.
 *      @return {boolean}
 *
 *  + getDimensionsInfo {Function}: optional
 *      @return {Array.<string|Object>} dimensionsInfo
 *              Like [{name: ..., type: ...}, 'xxx', ...]
 */
