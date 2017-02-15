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
         * 一天是某年的第几周第几天星期几
         *
         * @param  {number} date 具体日期(年-月-日)
         * @return {Object}      {}
         */
        getWdwByDays: function (date) {

            var datey = new Date(date);

            // 获得信息
            var year = datey.getFullYear();
            var month = datey.getMonth() + 1;
            var day = datey.getDate();

            // 星期几
            var weekDay = datey.getDay();

            // 当前年的第几天
            var nthOfDays = 0;
            for (var i = 1; i < month; i++) {
                nthOfDays += this.getMonthDays(i, year);
            }
            nthOfDays += day;

            // 第几周
            var date0 = new Date(year, 0, 1);
            var nthOfWeek = Math.floor((nthOfDays + date0.getDay() + 6) / 7);

            return {

                // 第几天
                days: nthOfDays,

                // 第几周
                weeks: nthOfWeek,

                // 星期几
                weekDay: weekDay
            };
        },

        /**
         * 知道 年份  第几周 和  星期几 获取日期
         *
         * @param  {number} year 年份
         * @param  {number} period 第几周
         * @param  {number} week   星期几
         * @return {string}        日期
         */
        getDateByWdw: function (year, period, week) {

            if (/^([1-4]?\d|5[123])$/.test(period) && /^[0-6]$/.test(week)) {
                var ymd = new Date(year, 0, 1);
                ymd.setDate(1 + (period - 1) * 7 - ymd.getDay() + week);

                var month = ymd.getMonth() + 1;
                month = month < 10 ? '0' + month : month;

                var day = ymd.getDate();
                day = day < 10 ? '0' + day : day;

                return year + '-' + month + '-' + day;
            }

            console.log('参数错误:第', period, '周，星期', week);
            return;

        },

        /**
         * 是不是闰年
         *
         * 年份除以400可整除，为闰年。
         * 年份除以4可整除但除以100不可整除，为闰年。
         * 年份除以4不可整除，为平年。
         * 年份除以100可整除但除以400不可整除，为平年
         *
         * @param  {number}  year 年份
         * @return {boolean}      是否是闰年
         */
        isLeapYear: function (year) {

            var c1 = year % 4 === 0;
            var c2 = year % 100 !== 0;
            var c3 = year % 400 === 0;

            var cond = c1 && c2 || c3;

            return !!cond;
        },

        /**
         * 一个月有多少天
         *
         * @param  {number} m 月份 从0开始
         * @param  {number} year 年份
         * @return {number}   当前月的天数
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
                        // 闰年加29
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
