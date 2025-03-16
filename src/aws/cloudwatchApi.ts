import {
  CloudWatchLogsClient,
  GetQueryResultsCommand,
  StartQueryCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { CloudWatch } from '../lib/clients/CloudWatch';
import { FormattedLogResult, CloudWatchQueryConfig } from '../types/AWS';
import { awsConfig } from '../awsConfig';

export class CloudWatchQuery {
  private client: CloudWatchLogsClient;
  private config: CloudWatchQueryConfig;

  constructor(client: CloudWatchLogsClient, config: CloudWatchQueryConfig) {
    this.client = client;
    this.config = config;
  }

  async run(): Promise<FormattedLogResult[]> {
    try {
      const { queryId } = await this.client.send(
        new StartQueryCommand({
          logGroupNames: this.config.logGroupNames,
          queryString: this.config.queryString,
          startTime: Math.floor(this.config.startTime.getTime() / 1000),
          endTime: Math.floor(this.config.endTime.getTime() / 1000),
          limit: this.config.limit,
        })
      );

      if (!queryId) throw new Error('Failed to start CloudWatch Logs query');

      return await this.getResults(queryId);
    } catch (error) {
      console.error('CloudWatch Logs query error:', error);
      return [];
    }
  }

  private async getResults(queryId: string): Promise<FormattedLogResult[]> {
    const maxRetries = 60;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const { results, status } = await this.client.send(new GetQueryResultsCommand({ queryId }));

      if (['Complete', 'Failed', 'Cancelled', 'Timeout'].includes(status || '')) {
        if (status !== 'Complete') throw new Error(`Query failed with status: ${status}`);

        return (
          results?.map((entry) =>
            Object.fromEntries(entry.map(({ field, value }) => [field, value]))
          ) || []
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`Query timed out after ${maxRetries} attempts`);
  }
}

export async function getVPCFlowLogs(): Promise<FormattedLogResult[]> {
  const client = CloudWatch.getInstance();

  const query = new CloudWatchQuery(client, {
    logGroupNames: ['/aws/vpc/test-flow-logs'],
    queryString: `
      fields @timestamp, srcAddr, dstAddr, dstPort, srcPort, protocol, action, bytes, packets
      | filter action = "ACCEPT" and not(type like "ntm")
      | sort @timestamp desc
      | limit 300`,
    startTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    endTime: new Date(),
    limit: 300,
  });

  try {
    return await query.run();
  } catch (error) {
    console.error('Error querying VPC Flow Logs:', error);
    return [];
  }
}
