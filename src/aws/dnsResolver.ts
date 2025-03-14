import { AwsIpRangeManager } from './awsIpRangeManager'
import { DnsResponse } from './DnsResponse'
import { ResourceMetaData } from './resourceMap'

class DnsResolver {
  private static instance: DnsResolver
  private cache: Map<string, string> = new Map()
  private pendingRequests: Map<string, Promise<string>> = new Map()

  // Cloudflare dns-query api
  private dnsApiUrl = 'https://cloudflare-dns.com/dns-query'

  private constructor() {}

  public static getInstance(): DnsResolver {
    if (!DnsResolver.instance) {
      DnsResolver.instance = new DnsResolver()
    }
    return DnsResolver.instance
  }

  // Attempt to resolve an IP to a hostname
  public async resolveIp(ip: string): Promise<string> {
    // Check if we already have this information cached
    if (this.cache.has(ip)) {
      return this.cache.get(ip)!
    }

    // Check if there's a pending request for this IP
    if (this.pendingRequests.has(ip)) {
      return this.pendingRequests.get(ip)!
    }

    // Create a new request
    const requestPromise = this._fetchPtrRecord(ip)
    this.pendingRequests.set(ip, requestPromise)

    try {
      const hostname = await requestPromise
      this.cache.set(ip, hostname)
      return hostname
    } finally {
      this.pendingRequests.delete(ip)
    }
  }

  // Format IP for reverse DNS lookup
  private _formatReverseIp(ip: string): string {
    // Convert IP
    // e.g: 8.8.8.8 becomes 8.8.8.8.in-addr.arpa
    return `${ip.split('.').reverse().join('.')}.in-addr.arpa`
  }

  private async _fetchPtrRecord(ip: string): Promise<string> {
    try {
      const reversedIp = this._formatReverseIp(ip)
      const response = await fetch(
        `${this.dnsApiUrl}?name=${reversedIp}&type=PTR`,
        {
          headers: {
            Accept: 'application/dns-json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`DNS query failed: ${response.statusText}`)
      }

      const data: DnsResponse = await response.json()

      if (data.Answer && data.Answer.length > 0) {
        return data.Answer[0].data
      } else {
        return ip
      }
    } catch (error) {
      console.error(`Error resolving hostname for IP ${ip}:`, error)
      // Return the IP if lookup failed
      return ip
    }
  }

  public getResourceName(ip: string, hostname: string): string {
    if (hostname && hostname !== ip) {
      // Strip the hostname to just the domain name (e.g remove subdomains)
      const parts: string[] = hostname.split('.')
      if (parts.length >= 2) {
        const domainParts: string[] = parts.slice(-2)
        if (domainParts[0].length > 3) {
          // for cases like "co.uk"
          return domainParts.join('.')
        } else if (parts.length >= 3) {
          return parts.slice(-3).join('.')
        }
      }
      return hostname
    }
    return `IP ${ip}`
  }
}

export async function retrieveDNSInfo(uniqueIps: Set<string>) {
  const dnsResolver = DnsResolver.getInstance()
  const resourceMetadata = ResourceMetaData.getInstance()
  const dnsResolutionPromises: Promise<void>[] = []
  const awsIpChecker = AwsIpRangeManager.getInstance()
  await awsIpChecker.initialize()
  // keep track of unique ips that we are processing to ensure we are not entering an ip into the queue multiple times 
  const processingIps = new Set<string>()
  
  for (const ip of uniqueIps) {
    if (!awsIpChecker.isAwsIp(ip) && !resourceMetadata.hasResource(ip) && !processingIps.has(ip)) {
      processingIps.add(ip)
      
      dnsResolutionPromises.push(
        dnsResolver.resolveIp(ip).then((hostname) => {
          const name = dnsResolver.getResourceName(ip, hostname)
          const type = hostname !== ip ? 'Domain' : 'IP'
          resourceMetadata.setResource(ip, {
            id: ip,
            type,
            name,
          })
        }).catch((err) => {
          console.error(`Failed to resolve hostname for IP ${ip}:`, err)
          // Fall back to ips
          resourceMetadata.setResource(ip, {
            id: ip,
            type: 'IP',
            name: `IP ${ip}`,
          })
        })
      )
    }
  }

  await Promise.allSettled(dnsResolutionPromises)
  console.log(`Resolved hostnames for ${dnsResolutionPromises.length} IPs`)
}