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

            // 获得年份
            var year = datey.getFullYear();
            var month = datey.getMonth() + 1;
            var day = datey.getDate();

            // 表示改日期为当年的第几天
            var days = 0;

            // 累加月天数
            for (var i = 1; i < month; i++) {

                switch (i) {

                    // 大月的情况加31
                    case 1:
                    case 3:
                    case 5:
                    case 7:
                    case 8:
                    case 10:
                    case 12: {
                        days += 31;
                        break;
                    }

                    // 小月的情况加30
                    case 4:
                    case 6:
                    case 9:
                    case 11: {
                        days += 30;
                        break;
                    }

                    // 二月的情况，根据年类型来加
                    case 2: {
                        if (this.isLeapYear(year)) {
                            // 闰年加29
                            days += 29;
                        }
                        else {
                            days += 28;
                        }
                        break;
                    }
                }
            }

            day = day * 1;

            // 月天数之和加上日天数
            days += day;

            // 当年的第一天是周几
            var date0 = new Date(year, 0, 1);

            // 将日期值格式化,0-11代表1月-12月;
            var date1 = new Date(year, month - 1, day);

            // 向下取整
            var nthOfWeek = Math.floor((days + date0.getDay() + 6) / 7);

            return {

                // 第几天
                days: days,

                // 第几周
                weeks: nthOfWeek,

                // 星期几
                weekDay: date1.getDay()
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

                var mouth = ymd.getMonth() + 1;

                mouth = mouth < 10 ? '0' + mouth : mouth;
                var day = ymd.getDate();

                day = day < 10 ? '0' + day : day;

                return year + '-' + mouth + '-' + day;
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

            var cond1 = year % 4 === 0;

            var cond2 = year % 100 !== 0;

            var cond3 = year % 400 === 0;

            var cond = cond1 && cond2 || cond3;

            return !!cond;
        }
    };

    return time;
});
