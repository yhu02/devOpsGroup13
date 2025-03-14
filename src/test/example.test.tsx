import { describe, expect, it } from 'vitest'

describe('Example Test Suite', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should work with async operations', async () => {
    const result = await Promise.resolve(42)
    expect(result).toBe(42)
  })
})
