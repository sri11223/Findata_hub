import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@validators/(.*)$': '<rootDir>/src/validators/$1',
  },
  setupFiles: ['<rootDir>/tests/helpers/test-setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/config/swagger.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000,
  globals: {
    'ts-jest': {
      tsconfig: {
        strict: true,
        esModuleInterop: true,
      },
    },
  },
};

export default config;
