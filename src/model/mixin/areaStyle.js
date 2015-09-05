define({
    getAreaStyle: function () {
        return {
            fill: this.get('color'),
            shadowBlur: this.get('shadowBlur'),
            shadowOffsetX: this.get('shadowOffsetX'),
            shadowOffsetY: this.get('shadowOffsetY'),
            shadowColor: this.get('shadowColor')
        };
    }
});