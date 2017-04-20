

var Babel = require('babel-core');

module.exports = function (wallaby) {

    return {
        files: [
            'src/**/*.js',
            {
                pattern: 'src/tests/**/*.spec.js',
                ignore: true
            }],

        tests: ['src/**/tests/*.spec.js'],
        env: {
            type: 'node',
            runner: 'node'
        },

        compilers: {
            'src/**/*.js': wallaby.compilers.babel({
                babel: Babel
            }),
            'src/**/*.jsx': wallaby.compilers.babel({
                babel: Babel
            })
        }
    };
};
