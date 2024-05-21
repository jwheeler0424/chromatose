import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageProvider: 'v8',
  testPathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.test.ts'],
};

export default config;
