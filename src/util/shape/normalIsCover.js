// 由于大多数shape默认的isCover都是相同的逻辑
// 所以在echarts里临时抽象一个module，用于isCover method
// TODO: 对zrender的isCover和getRect方法进行抽象，重新整理该逻辑

define(function () {
    return function (x, y) {
        var originPos = this.getTansform(x, y);
        x = originPos[0];
        y = originPos[1];

        // 快速预判并保留判断矩形
        var rect = this.style.__rect;
        if (!rect) {
            rect = this.style.__rect = this.getRect(this.style);
        }

        return x >= rect.x
            && x <= (rect.x + rect.width)
            && y >= rect.y
            && y <= (rect.y + rect.height);
    };
})
