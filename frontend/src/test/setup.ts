import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { beforeAll, afterAll, afterEach } from 'vitest'

// Mock global objects if needed
beforeAll(() => {
  // Example: setting up a mock server
  // server.listen();
})

// Cleanup after each test to prevent test pollution
afterEach(() => {
  cleanup()
})

// Close any resources after all tests run
afterAll(() => {
  // Example: shutting down a mock server
  // server.close();
})
