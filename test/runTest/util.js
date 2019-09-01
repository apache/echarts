const path = require('path');
const fse = require('fs-extra');
const https = require('https');
const fs = require('fs');

module.exports.getTestName = function(fileUrl) {
    return path.basename(fileUrl, '.html');
};


function getVersionDir(version) {
    version = version || 'developing';
    return `tmp/__version__/${version}`;
};
module.exports.getVersionDir = getVersionDir;


module.exports.prepareEChartsVersion = function (version) {
    let versionFolder = path.join(__dirname, getVersionDir(version));
    fse.ensureDirSync(versionFolder);
    if (!version) {
        // Developing version, make sure it's new build
        return fse.copy(
            path.join(__dirname, '../../dist/echarts.js'),
            `${versionFolder}/echarts.js`
        );
    }
    return new Promise(resolve => {
        if (!fs.existsSync(`${versionFolder}/echarts.js`)) {
            const file = fs.createWriteStream(`${versionFolder}/echarts.js`);

            console.log('Downloading echarts4.2.1 from ', `https://cdn.jsdelivr.net/npm/echarts@${version}/dist/echarts.js`);
            https.get(`https://cdn.jsdelivr.net/npm/echarts@${version}/dist/echarts.js`, response => {
                response.pipe(file);

                file.on('finish', () => {
                    resolve();
                });
            });
        }
        else {
            resolve();
        }
    });
}