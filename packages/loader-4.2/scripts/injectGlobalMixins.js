var prepend = require('prepend');

prepend('index.d.ts', '/// <reference path="./global.d.ts" />\n', function(error) {
    if (error)
        console.error(error.message);
});

