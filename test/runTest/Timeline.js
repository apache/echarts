module.exports = class Timeline {

    constructor(page) {
        this._page = page;

        this._timer = 0;
        this._current = 0;

        this._ops = [];
        this._currentOpIndex = 0;
    }

    _reset() {
        this._currentOpIndex = 0;
        this._current = Date.now();
        this._elapsedTime = 0;
    }


    async runAction(action, playbackSpeed) {
        this.stop();

        playbackSpeed = playbackSpeed || 1;

        if (!action.ops.length) {
            return;
        }

        this._ops = action.ops.slice().sort((a, b) => {
            return a.time - b.time;
        });
        let firstOp = this._ops[0];
        this._ops.forEach(op => {
            op.time -= firstOp.time;
        });

        this._reset();

        let self = this;

        return new Promise(resolve => {
            async function tick() {
                let current = Date.now();
                let dTime = current - self._current;
                self._elapsedTime += dTime * playbackSpeed;
                self._current = current;

                await self._update();
                if (self._currentOpIndex >= self._ops.length) {
                    // Finished
                    resolve();
                }
                else {
                    self._timer = setTimeout(tick, 16);
                }
            }
            tick();
        });
    }


    stop() {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = 0;
        }
    }

    async _update() {
        let op = this._ops[this._currentOpIndex];

        if (op.time > this._elapsedTime) {
            // Not yet.
            return;
        }

        let page = this._page;
        switch (op.type) {
            case 'mousedown':
                await page.mouse.move(op.x, op.y);
                await page.mouse.down();
                break;
            case 'mouseup':
                await page.mouse.move(op.x, op.y);
                await page.mouse.up();
                break;
            case 'mousemove':
                page.mouse.move(op.x, op.y);
                break;
        }

        this._currentOpIndex++;

    }
};