module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'nodenext',
        target: 'es2020',
        esModuleInterop: true,
        skipLibCheck: true,
        strict: true
      }
    }]
  },
  moduleNameMapper: {
    '^src/(.*)\\.js$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transformIgnorePatterns: [
    '\\/node_modules_(?!your-esm-package)/'
  ],
  // ESM support
  extensionsToTreatAsEsm: ['.ts'],
  testTimeout: 60000,
  setupFiles: ['<rootDir>/tests/setup.js']
};
