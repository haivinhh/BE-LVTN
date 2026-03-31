module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/services/**/*.js',
    'src/repositories/**/*.js',
    'src/controllers/**/*.js',
    'src/middleware/**/*.js',
    '!src/tests/**',
  ],
  coverageReporters: ['text', 'lcov'],
  testTimeout: 10000,
  clearMocks: true,
};
