define(function (require) {

    return {

        /**
         * @public
         * @return {Array.<number|string|Date>}
         */
        getMin: function () {
            var option = this.option;
            return option.rangeStart != null ? option.rangeStart : option.min;
        },

        /**
         * @public
         * @return {Array.<number|string|Date>}
         */
        getMax: function () {
            var option = this.option;
            return option.rangeEnd != null ? option.rangeEnd : option.max;
        },

        /**
         * @public
         * @return {boolean}
         */
        getNeedCrossZero: function () {
            var option = this.option;
            return (option.rangeStart != null || option.rangeEnd != null)
                ? false : !option.scale;
        },

        /**
         * @public
         * @param {number} rangeStart
         * @param {number} rangeEnd
         */
        setRange: function (rangeStart, rangeEnd) {
            this.option.rangeStart = rangeStart;
            this.option.rangeEnd = rangeEnd;
        },

        /**
         * @public
         */
        resetRange: function () {
            // rangeStart and rangeEnd is readonly.
            this.option.rangeStart = this.option.rangeEnd = null;
        }
    };

});