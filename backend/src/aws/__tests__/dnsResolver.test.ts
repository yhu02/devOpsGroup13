// import { beforeEach, describe, expect, it, vi } from 'vitest'
// import { DnsResolver, retrieveDNSInfo } from '../../../../backend/src/aws/dnsResolver'

// // Mock fetch so we don't make real network calls during tests
// globalThis.fetch = vi.fn()

// describe('DnsResolver', () => {
//   let dnsResolver: DnsResolver

//   beforeEach(() => {
//     // Clean up before each test
//     vi.clearAllMocks()
//     // Reset the singleton so tests don't affect each other
//     // @ts-ignore - I know this is private but need it for testing
//     DnsResolver.instance = undefined
//     dnsResolver = DnsResolver.getInstance()
//   })

//   describe('getInstance', () => {
//     it('should give back the same instance when called twice', () => {
//       const instance1 = DnsResolver.getInstance()
//       const instance2 = DnsResolver.getInstance()
//       // They should be the exact same object
//       expect(instance1).toBe(instance2)
//     })
//   })

//   describe('resolveIp', () => {
//     it('should use the cached result if we already looked up this IP', async () => {
//       const ip = '8.8.8.8'
//       const hostname = 'dns.google'
//       // Manually add to cache for testing
//       // @ts-ignore - accessing private stuff for the test
//       dnsResolver.cache.set(ip, hostname)

//       const result = await dnsResolver.resolveIp(ip)
//       expect(result).toBe(hostname)
//       // Should not call fetch since we had it in cache
//       expect(fetch).not.toHaveBeenCalled()
//     })

//     it('should look up the PTR record if IP is not in cache', async () => {
//       const ip = '8.8.8.8'
//       const mockResponse = {
//         Status: 0,
//         Answer: [{ data: 'dns.google' }],
//       }

//       // Pretend the API returned this response
//       ;(fetch as any).mockResolvedValueOnce({
//         ok: true,
//         json: () => Promise.resolve(mockResponse),
//       })

//       const result = await dnsResolver.resolveIp(ip)
//       expect(result).toBe('dns.google')
//       // Check that it called the right URL
//       expect(fetch).toHaveBeenCalledWith(
//         'https://cloudflare-dns.com/dns-query?name=8.8.8.8.in-addr.arpa&type=PTR',
//         expect.any(Object)
//       )
//     })

//     it('should just return the IP if the DNS query fails', async () => {
//       const ip = '8.8.8.8'

//       // Make the fetch fail
//       ;(fetch as any).mockResolvedValueOnce({
//         ok: false,
//         statusText: 'Not Found',
//       })

//       const result = await dnsResolver.resolveIp(ip)
//       // Should fall back to the IP
//       expect(result).toBe(ip)
//     })

//     it('should return the IP if there are no answers in the response', async () => {
//       const ip = '8.8.8.8'
//       const mockResponse = {
//         Status: 0,
//         Answer: [], // Empty array = no answers
//       }

//       // API worked but no answers
//       ;(fetch as any).mockResolvedValueOnce({
//         ok: true,
//         json: () => Promise.resolve(mockResponse),
//       })

//       const result = await dnsResolver.resolveIp(ip)
//       // Should fall back to the IP
//       expect(result).toBe(ip)
//     })

//     it('should not make the same request twice if called at the same time', async () => {
//       const ip = '8.8.8.8'
//       const mockResponse = {
//         Status: 0,
//         Answer: [{ data: 'dns.google' }],
//       }

//       // Set up the mock response
//       ;(fetch as any).mockResolvedValueOnce({
//         ok: true,
//         json: () => Promise.resolve(mockResponse),
//       })

//       // Call the function twice without waiting
//       const promise1 = dnsResolver.resolveIp(ip)
//       const promise2 = dnsResolver.resolveIp(ip)

//       // Wait for both to finish
//       const [result1, result2] = await Promise.all([promise1, promise2])
//       expect(result1).toBe('dns.google')
//       expect(result2).toBe('dns.google')
//       // Should only call fetch once even though we called the function twice
//       expect(fetch).toHaveBeenCalledTimes(1)
//     })
//   })

//   describe('getResourceName', () => {
//     it('should return the domain for a simple hostname', () => {
//       const ip = '8.8.8.8'
//       const hostname = 'example.com'
//       const result = dnsResolver.getResourceName(ip, hostname)
//       expect(result).toBe('example.com')
//     })

//     it('should handle weird TLDs like co.uk correctly', () => {
//       const ip = '8.8.8.8'
//       const hostname = 'example.co.uk'
//       const result = dnsResolver.getResourceName(ip, hostname)
//       expect(result).toBe('example.co.uk')
//     })

//     it('should format as IP when hostname is the same as the IP', () => {
//       const ip = '8.8.8.8'
//       const result = dnsResolver.getResourceName(ip, ip)
//       expect(result).toBe('IP 8.8.8.8')
//     })
//   })
// })

// describe('retrieveDNSInfo', () => {
//   beforeEach(() => {
//     vi.clearAllMocks()
//     // Reset the singleton before each test
//     // @ts-ignore - need to access private property
//     DnsResolver.instance = undefined
//   })

//   it('should process all the IPs and update the resource metadata', async () => {
//     // Fake DNS response
//     const mockDnsResponse = {
//       Status: 0,
//       Answer: [{ data: 'example.com' }],
//     }

//     // Fake AWS IP ranges response
//     const mockAwsRangesResponse = {
//       prefixes: [],
//       ipv6_prefixes: [],
//     }

//     // Make fetch return different things depending on the URL
//     ;(fetch as any).mockImplementation((url: string) => {
//       if (url.includes('ip-ranges.amazonaws.com')) {
//         return Promise.resolve({
//           ok: true,
//           json: () => Promise.resolve(mockAwsRangesResponse),
//         })
//       }
//       return Promise.resolve({
//         ok: true,
//         json: () => Promise.resolve(mockDnsResponse),
//       })
//     })

//     const uniqueIps = new Set(['1.1.1.1', '2.2.2.2'])
//     await retrieveDNSInfo(uniqueIps)

//     // Should call fetch for each IP plus once for AWS IP ranges
//     expect(fetch).toHaveBeenCalledTimes(3)
//   })
// })
