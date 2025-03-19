import {
  CloudWatchLogsClient,
  GetQueryResultsCommand,
  StartQueryCommand,
} from '@aws-sdk/client-cloudwatch-logs'
import { CloudWatch } from '../lib/clients/CloudWatch'
import { FormattedLogResult, type CloudWatchQueryConfig } from '../types/AWS'

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
  const client = CloudWatch.getInstance()
  return new CloudWatchQuery(client, {
    // logGroupNames: ['/aws/vpc/test-flow-logs'],
    logGroupNames: ['/demo/flow-logs'], // Demo log group
    queryString: `
      fields @timestamp, srcAddr, dstAddr, dstPort, srcPort, protocol, action, bytes, packets
      | filter action = "ACCEPT" and not (srcPort = 123 or dstPort = 123 and protocol = 17)
      | sort @timestamp desc
      | limit 2000`,
    startTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    endTime: new Date(),
    limit: 2000,
  })
}

export async function getVPCFlowLogs(): Promise<FormattedLogResult[]> {
  try {
    const logs = await createVpcFlowLogsQuery().run()
    return logs
  } catch (error) {
    console.error('Error querying VPC Flow Logs:', error)
    return []
  }
}
