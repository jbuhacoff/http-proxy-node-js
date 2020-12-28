/*
Creates a copy of package.json for distribution
*/
var fs = require('fs');
const pkg = require('./package.json');

const distpkg = {};

distpkg.name = `${pkg.name}-dist`;

['version','license','author','contributors'].forEach((item) => {
    if (pkg[item]) {
        distpkg[item] = pkg[item];
    }
});

if (pkg.scripts) {
    distpkg.scripts = {};
    ['start'].forEach((item) => {
        if (pkg.scripts[item]) {
            distpkg.scripts[item] = pkg.scripts[item];
        }
    });
}

const output = JSON.stringify(distpkg, null, 2);

if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}

fs.writeFileSync('dist/package.json', output);
