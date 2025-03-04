import { AwsResource, Dependency } from '@/types/AWS'
import {
  CloudWatchLogsClient,
  StartQueryCommand,
  GetQueryResultsCommand,
} from '@aws-sdk/client-cloudwatch-logs'

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
      fields @timestamp, srcAddr, dstAddr, type
      | filter action = "ACCEPT" and not(type like "ntm")
      | sort @timestamp desc
      | limit 10`,
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endTime: new Date(),
    limit: 10,
  })
}
function getResourceMap() {
  const resourceMap = new Map<string, AwsResource>([
    ['172.31.42.86', { id: 'VPCID', type: 'VPC', name: 'The VPC' }],
  ])
  return resourceMap
}

export async function getVPCFlowLogs(): Promise<{
  resources: AwsResource[]
  dependencies: Dependency[]
}> {
  try {
    const logs = await createVpcFlowLogsQuery().run()
    const dependencies: Dependency[] = []

    const resourceMap = getResourceMap()
    const dependencyMap = new Map<string, Set<string>>()

    logs.forEach((log) => {
      const src = log.srcAddr
      const dst = log.dstAddr

      // Check if the src IP exists in the map, otherwise add it
      if (src && !resourceMap.has(src)) {
        resourceMap.set(src, { id: src, type: 'IP', name: `Source ${src}` })
      }

      // Check if the dst IP exists in the map, otherwise add it
      if (dst && !resourceMap.has(dst)) {
        resourceMap.set(dst, {
          id: dst,
          type: 'IP',
          name: `Destination ${dst}`,
        })
      }

      // Retrieve the IDs for src and dst, ensuring they exist in the map
      const dstID = resourceMap.get(dst)?.id || dst
      const srcID = resourceMap.get(src)?.id || src

      // Record dependencies if both src and dst are available
      if (src && dst) {
        if (!dependencyMap.has(srcID)) {
          dependencyMap.set(srcID, new Set())
        }

        if (!dependencyMap.get(srcID)?.has(dstID)) {
          dependencies.push({
            from: srcID,
            to: resourceMap.get(dst)?.id || dst,
            relationship: 'connects to',
          })
          dependencyMap.get(srcID)?.add(dstID)
        }
      }
    })

    console.log(resourceMap)
    console.log(dependencies)

    return { resources: Array.from(resourceMap.values()), dependencies }
  } catch (error) {
    console.error('Error querying VPC Flow Logs:', error)
    return { resources: [], dependencies: [] }
  }
}
