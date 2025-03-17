export default {
    test: {
      exclude: ['node_modules/**', 'integration/**/*.test.ts'], // Exclude node_modules & Playwright tests
      coverage: {
        reporter: ['text', 'lcov'],
      },
    },
  }
  