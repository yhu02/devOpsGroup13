import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs'

/**
 * Singleton class for CloudWatch Logs client
 */
export class CloudWatch {
  private static instance: CloudWatchLogsClient | null = null

  private constructor() {}

  public static getInstance(): CloudWatchLogsClient {
    if (!CloudWatch.instance) {
      CloudWatch.instance = new CloudWatchLogsClient({
        region: import.meta.env.VITE_AWS_REGION,
        credentials: {
          accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
          secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
        },
      })
    }

    return CloudWatch.instance
  }

  /**
   * Check if it is healthy.
   */
  public static async checkHealth(): Promise<boolean> {
    try {
      const client = CloudWatch.getInstance()

      // Attempt to make a simple request to verify connectivity
      await client.config.credentials()

      return true
    } catch (error) {
      console.error('CloudWatch client health check failed:', error)
      return false
    }
  }
}
