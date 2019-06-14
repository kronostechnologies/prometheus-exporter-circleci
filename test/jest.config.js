const path = require('path');

module.exports = {
    preset: 'ts-jest',
    clearMocks: true,
    resetMocks: true,
    testEnvironment: 'node',
    moduleDirectories: [
        'src',
        'node_modules',
    ],
    rootDir: '../',
    collectCoverageFrom: ['src/**/*.ts'],
};
