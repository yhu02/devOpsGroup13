import { expect, test } from '@playwright/test'

test('DNS query is automatically made when loading home page', async ({
  page,
}) => {
  // store DNS-related network requests for verification
  const dnsRequests: string[] = []

  // monitor network requests
  page.on('request', (request) => {
    const url = request.url()
    // Filter for DNS reverse lookup requests
    if (url.includes('/dns-query') && url.includes('in-addr.arpa')) {
      dnsRequests.push(url)
    }
  })

  // Navigate to the home page
  await page.goto('/', {
    waitUntil: 'networkidle',
  })

  await page.waitForTimeout(10000)

  // verify that at least one DNS query was made
  expect(dnsRequests.length).toBeGreaterThan(0)
  // verify the format of the DNS query
  expect(dnsRequests[0]).toContain('in-addr.arpa')
  expect(dnsRequests[0]).toContain('type=PTR')
})
