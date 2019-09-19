const glob = require('glob');
const fs = require('fs');

const result = {};
glob('*.json', (err, files) => {
    files.forEach(file => {
        if (file.match('__meta__')) {
            return;
        }
        const actions = JSON.parse(fs.readFileSync(file, 'utf-8'));
        result[file.replace(/.json$/, '')] = actions.length;
    });
    fs.writeFileSync('__meta__.json', JSON.stringify(result, null, 2), 'utf-8');
});