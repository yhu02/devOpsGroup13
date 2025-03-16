import { CloudWatchLogsClient, CloudWatchLogsClientConfig, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';

export class CloudWatch {
  private static instance: CloudWatchLogsClient | null = null;

  private constructor() {}

  public static getInstance(config?: CloudWatchLogsClientConfig): CloudWatchLogsClient {
    if (!CloudWatch.instance) {
      CloudWatch.instance = new CloudWatchLogsClient(config || {});
    }
    return CloudWatch.instance;
  }

  public static async checkHealth(): Promise<boolean> {
    if (!CloudWatch.instance) {
      throw new Error('CloudWatchLogsClient must be initialized before checking health.');
    }

    try {
      await CloudWatch.instance.send(new DescribeLogGroupsCommand({ limit: 1 }));
      return true;
    } catch (error) {
      console.error('CloudWatch client connectivity check failed:', error);
      return false;
    }
  }
}
