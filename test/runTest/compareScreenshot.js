const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const fs = require('fs');

function readPNG(path) {
    return new Promise(resolve => {
        fs.createReadStream(path)
            .pipe(new PNG())
            .on('parsed', function () {
                resolve({
                    data: this.data,
                    width: this.width,
                    height: this.height
                });
            });
    });
}

module.exports = function (expectedShotPath, actualShotPath, threshold = 0.1) {
    return Promise.all([
        readPNG(expectedShotPath),
        readPNG(actualShotPath)
    ]).then(([expectedImg, actualImg]) => {
        let width = expectedImg.width;
        let height = expectedImg.height;
        if (
            (width !== actualImg.width)
          || (height !== actualImg.height)
        ) {
            throw new Error('Image size not match');
        }
        const diffPNG = new PNG({width, height});
        let diffPixelsCount = pixelmatch(expectedImg.data, actualImg.data, diffPNG.data, width, height, {threshold});
        let totalPixelsCount = width * height;

        return {
            diffRatio: diffPixelsCount / totalPixelsCount,
            diffPNG
        };
    });
};