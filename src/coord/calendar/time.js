/**
 * @file time.js
 * @author dxh
 */

define(function (require) {
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
         * @return {[Object]}       obj
         */
        getRangeInfo: function (range) {

            var start = this.getYMDInfo(range[0]);
            var end = this.getYMDInfo(range[1]);

            // (24*60*60*1000)
            var allDay = (end.time - start.time) / 86400000 + 1;

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

            return this.getYMDInfo(time).format;

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
            date = new Date(date);

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
                format: format
            };
        },

        /**
         * get year-month of range
         *
         * @param  {Array} range [d1, d2]
         * @return {object}       obj
         */
        getMonthOfRange: function (range) {
            var start = this.getYMDInfo(range[0]);
            var end = this.getYMDInfo(range[1]);
            var startM = start.m;
            var endM = end.m;
            var startY = start.y;
            var endY = end.y;

            var rs = [];

            while (startY <= endY) {

                if (startY === endY) {

                    while (startM < endM) {

                        startM++;
                        rs.push(startY + '-' + startM);
                    }

                    startY++;
                }
                else {
                    startM++;

                    if (startM > 12) {
                        startM = 1;
                        startY++;
                    }
                    rs.push(startY + '-' + startM);
                }

            }

            var num = (end.y - start.y) * 12 + (end.m - start.m);

            return {
                months: rs,
                num: num
            };
        },

        /**
         * isLeapYear
         *
         * @param  {number}  year year
         * @return {boolean}      isLeap
         */
        isLeapYear: function (year) {

            var c1 = year % 4 === 0;
            var c2 = year % 100 !== 0;
            var c3 = year % 400 === 0;

            var cond = c1 && c2 || c3;

            return !!cond;
        },

        /**
         * how many days in one month
         *
         * @param  {number} m    month
         * @param  {number} year year
         * @return {number}      days
         */
        getMonthDays: function (m, year) {

            var days = 0;

            switch (+m) {
                case 1:
                case 3:
                case 5:
                case 7:
                case 8:
                case 10:
                case 12: {
                    days = 31;
                    break;
                }

                case 4:
                case 6:
                case 9:
                case 11: {
                    days = 30;
                    break;
                }

                case 2: {
                    if (this.isLeapYear(year)) {
                        // LeapYear 29
                        days = 29;
                    }
                    else {
                        days = 28;
                    }
                    break;
                }
            }

            return days;
        }
    };

    return time;
});
