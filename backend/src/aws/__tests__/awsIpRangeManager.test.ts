import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AwsIpRangeManager } from '../awsIpRangeManager'

// Mock fetch because we don't want to make real network calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('AwsIpRangeManager', () => {
  // Sample data that looks like what AWS would return
  const mockAwsIpRanges = {
    syncToken: '123456789',
    createDate: '2024-03-14-10-00-00',
    prefixes: [
      {
        ip_prefix: '3.2.34.0/24',
        region: 'us-east-1',
        service: 'AMAZON',
      },
      {
        ip_prefix: '15.230.56.0/24',
        region: 'us-west-2',
        service: 'AMAZON',
      },
    ],
  }

  beforeEach(() => {
    // Clean up before each test
    vi.clearAllMocks()
    // Reset the singleton so each test starts fresh
    // @ts-ignore - I know this is private but need to access for testing
    AwsIpRangeManager.instance = undefined
  })

  afterEach(() => {
    // Clean up after tests too
    vi.resetAllMocks()
  })

  it('should be a singleton', () => {
    // Get two instances and make sure they're the same object
    const instance1 = AwsIpRangeManager.getInstance()
    const instance2 = AwsIpRangeManager.getInstance()
    expect(instance1).toBe(instance2) // They should be the same!
  })

  it('should initialize and fetch IP ranges successfully', async () => {
    // Make our mock fetch return success with our test data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAwsIpRanges),
    })

    const manager = AwsIpRangeManager.getInstance()
    await manager.initialize()

    // Check if it called fetch with the right URL
    expect(mockFetch).toHaveBeenCalledWith(
      'https://ip-ranges.amazonaws.com/ip-ranges.json'
    )
    // Check if it's initialized now
    // @ts-ignore - Need to check private property
    expect(manager.initialized).toBe(true)
  })

  it('should handle fetch errors gracefully', async () => {
    // Make fetch fail this time
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const manager = AwsIpRangeManager.getInstance()
    await manager.initialize()

    // Even with error, it should mark as initialized
    // @ts-ignore - Checking private stuff again
    expect(manager.initialized).toBe(true)
    // And have empty ranges
    // @ts-ignore
    expect(manager.ranges).toEqual([])
  })

  it('should correctly identify AWS IPs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAwsIpRanges),
    })

    const manager = AwsIpRangeManager.getInstance()
    await manager.initialize()

    // This IP is in our mock range so should be true
    expect(manager.isAwsIp('3.2.34.100')).toBe(true)
    // This one isn't so should be false
    expect(manager.isAwsIp('8.8.8.8')).toBe(false)
  })

  it('should handle invalid IPs gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAwsIpRanges),
    })

    const manager = AwsIpRangeManager.getInstance()
    await manager.initialize()

    // Should not crash with bad input
    expect(manager.isAwsIp('invalid-ip')).toBe(false)
  })

  it('should return false when checking IP before initialization', () => {
    // Don't initialize, just check right away
    const manager = AwsIpRangeManager.getInstance()
    expect(manager.isAwsIp('3.2.34.100')).toBe(false)
  })

  it('should not reinitialize if already initialized', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAwsIpRanges),
    })

    const manager = AwsIpRangeManager.getInstance()
    await manager.initialize()

    // Call initialize again - shouldn't fetch twice
    await manager.initialize()

    // Fetch should only be called once
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should handle non-ok response from AWS', async () => {
    // AWS returns an error status
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    })

    const manager = AwsIpRangeManager.getInstance()
    await manager.initialize()

    // Should still be initialized
    // @ts-ignore
    expect(manager.initialized).toBe(true)
    // But with empty ranges
    // @ts-ignore
    expect(manager.ranges).toEqual([])
  })
})
