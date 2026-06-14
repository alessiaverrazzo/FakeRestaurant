module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  roots: ['<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test).ts'],

  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],

  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  verbose: true,
};
