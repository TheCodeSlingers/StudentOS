module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts", "**/*.spec.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  collectCoverage: true,
  coverageReporters: ["text", "lcov", "json-summary"],
  testTimeout: 30000,
  maxWorkers: 1,
  detectOpenHandles: false,
};
