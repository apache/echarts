define({
    getLineStyle: function () {
        return {
            lineWidth: this.get('width'),
            stroke: this.get('color'),
            lineDash: this.getLineDash(),
            shadowBlur: this.get('shadowBlur'),
            shadowOffsetX: this.get('shadowOffsetX'),
            shadowOffsetY: this.get('shadowOffsetY'),
            shadowColor: this.get('shadowColor')
        };
    },

    getLineDash: function () {
        var type = this.get('type');
        return type === 'solid' ? null
            : (type === 'dashed' ? [5, 5] : [1, 1]);
    }
});