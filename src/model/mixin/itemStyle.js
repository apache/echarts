define({
    getItemStyle: function () {
        return {
            fill: this.get('color'),
            stroke: this.get('borderColor'),
            lineWidth: this.get('borderWidth'),

            shadowBlur: this.get('shadowBlur'),
            shadowOffsetX: this.get('shadowOffsetX'),
            shadowOffsetY: this.get('shadowOffsetY'),
            shadowColor: this.get('shadowColor')
        };
    }
});