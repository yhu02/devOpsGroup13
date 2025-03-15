import { AWS_IP_RANGES_URL } from '@/types/AWS'
import { AwsIpRanges } from '@/types/dnsAndIp'
import ipaddr from 'ipaddr.js'

// singleton class to manage AWS IP ranges

export class AwsIpRangeManager {
  private static instance: AwsIpRangeManager
  private initialized: boolean = false
  private ranges: {
    prefix: string
    parsed: [ipaddr.IPv4 | ipaddr.IPv6, number]
  }[] = []
  private initPromise: Promise<void> | null = null

  private constructor() {}

  public static getInstance(): AwsIpRangeManager {
    if (!AwsIpRangeManager.instance) {
      AwsIpRangeManager.instance = new AwsIpRangeManager()
    }
    return AwsIpRangeManager.instance
  }

  public initialize(): Promise<void> {
    if (this.initialized) return Promise.resolve()
    if (this.initPromise) return this.initPromise

    this.initPromise = this._fetchAndInitialize()
    return this.initPromise
  }

  private async _fetchAndInitialize(): Promise<void> {
    try {
      console.log('Fetching AWS IP ranges...')
      const response = await fetch(AWS_IP_RANGES_URL)
      if (!response.ok) {
        throw new Error(`Failed to fetch AWS IP ranges: ${response.statusText}`)
      }

      const data: AwsIpRanges = await response.json()

      // Parse and store IP ranges
      this.ranges = data.prefixes.map((entry) => ({
        prefix: entry.ip_prefix,
        parsed: ipaddr.parseCIDR(entry.ip_prefix),
      }))

      this.initialized = true
      console.log(
        `Finishes parsing AWS Ranges Loaded ${this.ranges.length} IP ranges`
      )
    } catch (error) {
      console.error('Error loading AWS IP ranges:', error)
      this.ranges = []
      this.initialized = true
    }
  }

  public isAwsIp(ip: string): boolean {
    if (!this.initialized) {
      console.warn('AWS IP range check called before initialization completed')
      return false
    }

    try {
      const parsedIp = ipaddr.parse(ip)
      return this.ranges.some((range) => {
        const [rangeIp, prefixLength] = range.parsed
        return parsedIp.match(rangeIp, prefixLength)
      })
    } catch (error) {
      console.error(`Error while checking if ${ip} is an AWS IP:`, error)
      return false
    }
  }
}
