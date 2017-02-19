/**
 * @file time.js
 * @author dxh
 */


define(function (require) {

    var number = require('./number');

    // (24*60*60*1000)
    var ONEDAY = 86400000;

    /**
     * desc
     *
     * @type {Object}
     */
    var time = {

        /**
         * range info
         *
         * @param  {Array} range range ['2017-01-01', '2017-07-08']
         * @return {Object}       obj
         */
        getRangeInfo: function (range) {

            var start = this.getYMDInfo(range[0]);
            var end = this.getYMDInfo(range[1]);

            var allDay = Math.floor(end.time / ONEDAY) - Math.floor(start.time / ONEDAY) + 1;

            var weeks = Math.floor((allDay + start.day + 6) / 7);

            return {
                range: [start.format, end.format],
                start: start,
                end: end,
                allDay: allDay,
                weeks: weeks,
                fweek: start.day,
                lweek: end.day
            };
        },

        /**
         * According to nthWeeks and week day  get date
         *
         * @param  {number} nthWeek the week
         * @param  {[number]} day   the week day
         * @param  {Array} range [d1, d2]
         * @return {string}         'YYYY-MM-DD'
         */
        getRangeDateOfWeek: function (nthWeek, day, range) {
            var rangeInfo = this.getRangeInfo(range);

            if (nthWeek > rangeInfo.weeks
                || (nthWeek === 0 && day < rangeInfo.fweek)
                || (nthWeek === rangeInfo.weeks && day > rangeInfo.lweek)) {
                return false;
            }

            var nthDay = (nthWeek - 1) * 7 - rangeInfo.fweek + day;

            var time = this.getYMDInfo(rangeInfo.range[0]).time + nthDay * 86400000;

            return this.getYMDInfo(time);

        },

        /**
         * judge the date within range
         *
         * @param  {string|number}  date  date
         * @param  {Array} range [d1, d2]
         * @return {Boolean}       true | false
         */
        isInRangeOfDate: function (date, range) {
            var start = this.getYMDInfo(range[0]).time;
            var end = this.getYMDInfo(range[1]).time;
            var cur = this.getYMDInfo(date).time;

            if (cur >= start && cur <= end) {
                return true;
            }

            return false;
        },

        /**
         * get date info
         *
         * @param  {string|number} date date
         * @return {Object}      info
         */
        getYMDInfo: function (date) {

            date = number.parseDate(date);

            var y = date.getFullYear();

            var m = date.getMonth() + 1;
            m = m < 10 ? '0' + m : m;

            var d = date.getDate();
            d = d < 10 ? '0' + d : d;

            var day = date.getDay();
            var time = date.getTime();

            var format = y + '-' + m + '-' + d;

            return {
                y: y,
                m: +m,
                d: +d,
                day: day,
                time: time,
                format: format,
                date: date
            };
        },

        getNextNDay: function (date, n) {
            n = n || 0;
            if (n === 0) {
                return this.getYMDInfo(date);
            }

            var time = this.getYMDInfo(date).time;

            return this.getYMDInfo(time + 86400000 * n);
        }
    };

    return time;
});
