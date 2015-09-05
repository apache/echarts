define({
    getFont: function () {
        return [
            this.get('fontStyle'),
            this.get('fontWeight'),
            this.get('fontSize') + 'px',
            this.get('fontFamily')
        ].join(' ');
    }
});