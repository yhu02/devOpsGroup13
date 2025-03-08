import { AwsResource, Dependency } from '@/types/AWS'
import {
  CloudWatchLogsClient,
  StartQueryCommand,
  GetQueryResultsCommand,
} from '@aws-sdk/client-cloudwatch-logs'
import ipaddr from 'ipaddr.js'
import { DnsResolver } from './dns-resolver'

interface CloudWatchQueryConfig {
  logGroupNames: string[]
  queryString: string
  startTime: Date
  endTime: Date
  limit: number
}

interface FormattedLogResult {
  [key: string]: string
}

interface AwsIpRangeEntry {
  ip_prefix: string
  region: string
  service: string
  network_border_group: string
}

interface AwsIpRanges {
  createDate: string
  prefixes: AwsIpRangeEntry[]
  ipv6_prefixes: any[]
}


// AWS IP ranges official JSON URL
const AWS_IP_RANGES_URL = 'https://ip-ranges.amazonaws.com/ip-ranges.json'

// singleton class to manage AWS IP ranges
class AwsIpRangeManager {
  private static instance: AwsIpRangeManager
  private initialized: boolean = false
  private ranges: { prefix: string, parsed: any }[] = []
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
      this.ranges = data.prefixes.map(entry => ({
        prefix: entry.ip_prefix,
        parsed: ipaddr.parseCIDR(entry.ip_prefix)
      }))
      
      this.initialized = true
      console.log(`Finishes parsing AWS Ranges Loaded ${this.ranges.length} IP ranges`)
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
      return this.ranges.some(range => {
        const [rangeIp, prefixLength] = range.parsed
        return parsedIp.match(rangeIp, prefixLength)
      })
    } catch (error) {
      console.error(`Error while checking if ${ip} is an AWS IP:`, error)
      return false
    }
  }
}

class CloudWatchQuery {
  private client: CloudWatchLogsClient
  private config: CloudWatchQueryConfig

  constructor(client: CloudWatchLogsClient, config: CloudWatchQueryConfig) {
    this.client = client
    this.config = {
      logGroupNames: config.logGroupNames,
      queryString: config.queryString,
      startTime: config.startTime,
      endTime: config.endTime,
      limit: config.limit,
    }
  }
  async run(): Promise<FormattedLogResult[]> {
    try {
      const { queryId } = await this.client.send(
        new StartQueryCommand({
          logGroupNames: this.config.logGroupNames,
          queryString: this.config.queryString,
          startTime: Math.floor(this.config.startTime.valueOf() / 1000),
          endTime: Math.floor(this.config.endTime.valueOf() / 1000),
          limit: this.config.limit,
        })
      )
      if (!queryId) throw new Error('Failed to start CloudWatch Logs query')

      return await this._getResults(queryId)
    } catch (error) {
      console.error('CloudWatch Logs query error: ', error)
      return []
    }
  }

  private async _getResults(queryId: string): Promise<FormattedLogResult[]> {
    const maxTries = 60
    for (let retries = 0; retries < maxTries; retries++) {
      const { results, status } = await this.client.send(
        new GetQueryResultsCommand({ queryId })
      )
      if (
        ['Complete', 'Failed', 'Cancelled', 'Timeout'].includes(status || '')
      ) {
        if (status !== 'Complete') throw new Error(`Query failed: ${status}`)
        return (
          results?.map((entry) =>
            Object.fromEntries(entry.map(({ field, value }) => [field, value]))
          ) || []
        )
      }
      await new Promise((res) => setTimeout(res, 1000))
    }
    throw new Error(`Query timed out after: ${maxTries} tries`)
  }
}

function createVpcFlowLogsQuery(): CloudWatchQuery {
  const client = new CloudWatchLogsClient({
    region: import.meta.env.VITE_AWS_REGION,
    credentials: {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
    },
  })
  return new CloudWatchQuery(client, {
    logGroupNames: ['/aws/vpc/test-flow-logs'],
    queryString: `
      fields @timestamp, srcAddr, dstAddr, dstPort, srcPort, protocol, action, bytes, packets
      | filter action = "ACCEPT" and not(type like "ntm")
      | sort @timestamp desc
      | limit 300`,
    startTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    endTime: new Date(),
    limit: 300,
  })
}
const AWS_SERVICES_ID = 'aws-services'
function getResourceMap() {
  const resourceMap = new Map<string, AwsResource>([
    ['172.31.38.213', { id: 'EC2ID', type: 'EC2', name: 'test ec2' }],
    // Add AWS Services as a resource
    [AWS_SERVICES_ID, { id: AWS_SERVICES_ID, type: 'AWS', name: 'AWS Services' }],
  ])
  return resourceMap
}

export async function getVPCFlowLogs(): Promise<{
  resources: AwsResource[]
  dependencies: Dependency[]
}> {
  try {
    const awsIpChecker = AwsIpRangeManager.getInstance()
    await awsIpChecker.initialize()
    
    const dnsResolver = DnsResolver.getInstance()
    
    const logs = await createVpcFlowLogsQuery().run()
    const dependencies: Dependency[] = []

    const resourceMap = getResourceMap()
    const dependencyMap = new Map<string, Set<string>>()
    
    // Populate an IP set to process the ips in  batches
    const uniqueIps = new Set<string>()
    logs.forEach(log => {
      if (log.srcAddr) uniqueIps.add(log.srcAddr)
      if (log.dstAddr) uniqueIps.add(log.dstAddr)
    })
    
    // get DNS info for all non aws ips
    const dnsResolutionPromises: Promise<void>[] = []
    for (const ip of uniqueIps) {
      if (!awsIpChecker.isAwsIp(ip) && !resourceMap.has(ip)) {
        dnsResolutionPromises.push(
          dnsResolver.resolveIp(ip)
            .then(hostname => {
              if (!resourceMap.has(ip)) {
                const name = dnsResolver.getResourceName(ip, hostname)
                const type = hostname !== ip ? 'Domain' : 'IP'
                resourceMap.set(ip, {
                  id: ip,
                  type,
                  name
                })
              }
            })
            .catch(err => {
              console.error(`Failed to resolve hostname for IP ${ip}:`, err)
              // fall back to just ips if the lookup failed
              if (!resourceMap.has(ip)) {
                resourceMap.set(ip, {
                  id: ip,
                  type: 'IP',
                  name: `IP ${ip}`
                })
              }
            })
        )
      }
    }
    
    // Wait for all DNS resolution requests to complete
    await Promise.allSettled(dnsResolutionPromises)
    console.log(`Resolved hostnames for ${dnsResolutionPromises.length} IPs`)

    logs.forEach((log) => {
      const src = log.srcAddr
      const dst = log.dstAddr

      // Skip invalid entries
      if (!src || !dst) return

      // Determine if src is an AWS IP
      const srcIsAwsIp = awsIpChecker.isAwsIp(src)
      // Determine if dst is an AWS IP
      const dstIsAwsIp = awsIpChecker.isAwsIp(dst)

      // Get the source and destination IDs from the resource map or use AWS_SERVICES_ID for AWS IPs
      const srcID = srcIsAwsIp ? AWS_SERVICES_ID : (resourceMap.get(src)?.id || src)
      const dstID = dstIsAwsIp ? AWS_SERVICES_ID : (resourceMap.get(dst)?.id || dst)

      // Skip self-dependencies
      if (srcID === dstID) return

      if (!dependencyMap.has(srcID)) {
        dependencyMap.set(srcID, new Set())
      }

      if (!dependencyMap.get(srcID)?.has(dstID)) {
        dependencies.push({
          from: srcID,
          to: dstID,
          relationship: 'connects to',
        })
        dependencyMap.get(srcID)?.add(dstID)
      }
    })

    console.log(`Total resources identified: ${resourceMap.size}`)
    console.log(`Total dependencies: ${dependencies.length}`)

    return {
      resources: Array.from(resourceMap.values()),
      dependencies,
    }
  } catch (error) {
    console.error('Error querying VPC Flow Logs:', error)
    return { resources: [], dependencies: [] }
  }
}