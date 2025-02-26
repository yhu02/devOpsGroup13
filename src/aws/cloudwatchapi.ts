import {
    CloudWatchLogsClient,
    StartQueryCommand,
    GetQueryResultsCommand,
    ResultField
  } from "@aws-sdk/client-cloudwatch-logs";
  
//   Based on: https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/cloudwatch-logs/scenarios/large-query/cloud-watch-query.js

  interface CloudWatchQueryConfig {
    logGroupNames: string[];
    queryString: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }
  
  interface FormattedLogResult {
    [key: string]: string;
  }
  
  export class CloudWatchQuery {
    private client: CloudWatchLogsClient;
    private logGroupNames: string[];
    private queryString: string;
    private startTime: Date;
    private endTime: Date;
    private limit: number;
    private results: FormattedLogResult[] = [];
    private secondsElapsed: number = 0;
  
    /**
     * Class for running CloudWatch Logs Insights queries
     * @param client - The CloudWatch Logs client
     * @param config - Configuration options
     */
    constructor(client: CloudWatchLogsClient, config: CloudWatchQueryConfig) {
      this.client = client;
      
      // Set log groups to query (you can pass an array with multiple log groups)
      this.logGroupNames = config.logGroupNames;
      
      // The query string to run
      this.queryString = config.queryString;
      
      // Default to the last 24 hours if not specified
      this.startTime = config.startTime || new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.endTime = config.endTime || new Date();
      
      // set 10 as a fall back to avoid high costs
      this.limit = config.limit || 10;
    }
  
    /**
     * Run the query and get formatted results
     * @returns Promise with formatted query results
     */
    async run(): Promise<FormattedLogResult[]> {
      const start = new Date();
      
      try {
        // Start the query
        const { queryId } = await this._startQuery();
        if (!queryId) {
          throw new Error("Failed to start CloudWatch Logs query");
        }
        
        console.log(`Query started with ID: ${queryId}`);
        
        // Wait for query completion and get results
        const { results, status } = await this._waitUntilQueryDone(queryId);
        
        if (status === "Failed") {
          throw new Error("CloudWatch Logs query failed");
        } else if (status === "Cancelled") {
          throw new Error("CloudWatch Logs query was cancelled");
        } else if (status === "Timeout") {
          throw new Error("CloudWatch Logs query timed out");
        }
        
        // Format the results into a more usable structure
        this.results = this._formatResults(results || []);
        
        const end = new Date();
        this.secondsElapsed = (end.getTime() - start.getTime()) / 1000;
        
        console.log(`Query completed in ${this.secondsElapsed.toFixed(2)} seconds. Found ${this.results.length} logs.`);
        return this.results;
      } catch (error) {
        console.error("Error running CloudWatch Logs query:", error);
        throw error;
      }
    }
  
    /**
     * Start a query using the StartQueryCommand
     * @returns Promise with the query ID
     * @private
     */
    private async _startQuery(): Promise<{ queryId?: string }> {
      return this.client.send(
        new StartQueryCommand({
          logGroupNames: this.logGroupNames,
          queryString: this.queryString,
          startTime: Math.floor(this.startTime.valueOf() / 1000),
          endTime: Math.floor(this.endTime.valueOf() / 1000),
          limit: this.limit,
        })
      );
    }
  
    /**
     * Poll for query results until completion
     * @param queryId - The query ID to check
     * @returns Promise with query results and status
     * @private
     */
    private async _waitUntilQueryDone(queryId: string): Promise<{ results?: ResultField[][], status?: string }> {
      const maxRetries = 60; // 60 seconds timeout
      let retries = 0;
      
      while (retries < maxRetries) {
        const result = await this.client.send(
          new GetQueryResultsCommand({ queryId })
        );
        
        const queryDone = [
          "Complete",
          "Failed",
          "Cancelled",
          "Timeout",
          "Unknown"
        ].includes(result.status || "");
        
        if (queryDone) {
          return result;
        }
        
        // Wait 1 second before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries++;
      }
      
      throw new Error("Query timed out waiting for completion");
    }
  
    /**
     * Format the raw CloudWatch Logs results into a more usable structure
     * @param results - The raw query results
     * @returns Formatted results
     * @private
     */
    private _formatResults(results: ResultField[][]): FormattedLogResult[] {
      return results.map(result => {
        const row: FormattedLogResult = {};
        
        result.forEach(element => {
          if (element.field && element.value !== undefined) {
            row[element.field] = element.value;
          }
        });
        
        return row;
      });
    }
  }
  
  // Function to create a CloudWatchQuery client for our VPC Flow Logs
  export function createVpcFlowLogsQuery(): CloudWatchQuery {
    const client = new CloudWatchLogsClient({
    // You should create a .env file in the rootfolder with these as the keys and then ur access key as the value
      region: import.meta.env.VITE_AWS_REGION,
      credentials: {
        accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
        secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
      }
    });
    // The query we are running
    return new CloudWatchQuery(client, {
      logGroupNames: ["/aws/vpc/test-flow-logs"], 
      queryString: `
        fields @timestamp, srcAddr, dstAddr, action, protocol, packets, bytes
        | filter action = "ACCEPT"
        | sort @timestamp desc
        | limit 10
      `,
      limit: 10
    });
  }

  export async function getVPCFlowLogs(){
    try {
        const query = createVpcFlowLogsQuery();
        const results = await query.run();
        console.log("VPC Flow Logs query completed:", results);
        return results;
      } catch (error) {
        console.error("Error in VPC Flow Logs query handler:", error);
        alert("Error querying VPC Flow Logs. Check console for details.");
        return [];
      }
  }