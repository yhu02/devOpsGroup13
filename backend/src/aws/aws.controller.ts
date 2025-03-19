import { Controller, Post, Body, Get, HttpException, HttpStatus } from '@nestjs/common';
import { CloudWatchLogsClient, StartQueryCommand, GetQueryResultsCommand, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { awsConfig } from '../awsConfig';
import { Logger } from '@nestjs/common';
import { EC2Client, DescribeInstancesCommand, DescribeInstancesCommandInput } from "@aws-sdk/client-ec2";
import { AWS_SERVICES_ID, AwsResource, Dependency, FormattedLogResult, CloudWatchQueryConfig } from '../../../shared/types/AWS'
import { AwsIpRangeManager } from './awsIpRangeManager'
import { DnsResponse } from '../../../shared/types/dnsAndIp';
import { RDSClient, DescribeDBInstancesCommand, DescribeDBInstancesCommandInput } from "@aws-sdk/client-rds";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const cloudWatchClient = new CloudWatchLogsClient(process.env.ENVIRONMENT == "tst" ? awsConfig : {});

@Controller('api/aws')
export class AwsController {
  private readonly logger = new Logger('AwsController');
  private readonly cloudWatchClient = new CloudWatchLogsClient(process.env.ENVIRONMENT == "tst" ? awsConfig : {});

  // New endpoint for loading AWS resources
  @Get('load-resources')
  async loadResources() {
    try {
      const resourceMetadata = ResourceMetaData.getInstance();
      // Clear and map resources by fetching EC2 instances, flow logs, etc.
      await resourceMetadata.mapResources();

      return {
        resources: resourceMetadata.getAllResources(),
        dependencies: resourceMetadata.getDependencies(),
      };
    } catch (error: any) {
      this.logger.error('Error loading AWS resources', error);
      throw new HttpException(
        'Error loading AWS resources',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  async healthCheck() {
    try {
      this.logger.log('Checking AWS health status...');
      await this.cloudWatchClient.send(new DescribeLogGroupsCommand({ limit: 1 }));
      this.logger.log('AWS CloudWatch Logs: healthy');
      return { status: 'healthy' };
    } catch (error) {
      this.logger.error('AWS health check failed', error);
      throw new HttpException('unhealthy', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

class CloudWatchQuery {
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

export async function getVPCFlowLogs(client: CloudWatchLogsClient): Promise<FormattedLogResult[]> {

  const queryConfig: CloudWatchQueryConfig = {
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
  }

  const query = new CloudWatchQuery(client, queryConfig);

  try {
    return await query.run();
  } catch (error) {
    console.error('Error querying VPC Flow Logs:', error);
    return [];
  }
}

class ResourceMetaData {
  private static instance: ResourceMetaData
  private resourceMap: Map<string, AwsResource>
  private dependencies: Dependency[]
  private dependencyMap: Map<string, Set<string>>
  private constructor() {
    this.resourceMap = new Map<string, AwsResource>()
    this.dependencies = []
    this.dependencyMap = new Map<string, Set<string>>()
  }

  public static getInstance(): ResourceMetaData {
    if (!ResourceMetaData.instance) {
      ResourceMetaData.instance = new ResourceMetaData()
    }
    return ResourceMetaData.instance
  }

  public setResource(key: string, value: AwsResource): void {
    this.resourceMap.set(key, value)
  }

  public addDependency(e: Dependency) {
    this.dependencies.push(e)
  }
  public getDependencies(): Dependency[] {
    return this.dependencies
  }

  public getResource(key: string): AwsResource | undefined {
    return this.resourceMap.get(key)
  }
  public getAllResources(): AwsResource[] {
    return Array.from(this.resourceMap.values())
  }
  public getResourceMap(): Map<string, AwsResource> {
    return this.resourceMap
  }
  public resourceCount(): number {
    return this.resourceMap.size
  }
  public dependencyCount(): number {
    return this.dependencies.length
  }
  public hasResource(key: string): Boolean {
    return this.resourceMap.has(key)
  }
  public async mapResources() {
    this.dependencyMap.clear()
    this.resourceMap.clear()
    this.dependencies = []

    // all of the getters / api handlers
    // they should take the mapManager and use its .add function

    const vpcId = 'vpc-05ae9ae580dbfaf83' // Demo vpc
    // const vpcId = 'vpc-0c71a936b3fd5716c'
    const vpcRegion = 'eu-central-1'
    await describe_ec2s(vpcId, vpcRegion)
    await describe_rdss(vpcId, vpcRegion)


    // this.resourceMap.set('172.31.38.213', {
    //   id: 'EC2ID',
    //   type: 'EC2',
    //   name: 'test ec2',
    // })
    this.resourceMap.set(AWS_SERVICES_ID, {
      id: AWS_SERVICES_ID,
      type: 'AWS',
      name: 'AWS Services',
    })
    const logs: FormattedLogResult[] = await getVPCFlowLogs(cloudWatchClient)
    await this.processLogs(logs)
    return
  }
  public processConnection(srcAddr: string, dstAddr: string) {
    const awsIpChecker = AwsIpRangeManager.getInstance()
    // Skip invalid entries
    if (!srcAddr || !dstAddr) return

    const srcIsAwsIp = awsIpChecker.isAwsIp(srcAddr)
    const dstIsAwsIp = awsIpChecker.isAwsIp(dstAddr)

    const srcID = this.hasResource(srcAddr)
      ? this.getResource(srcAddr)?.id || srcAddr
      : srcIsAwsIp
        ? AWS_SERVICES_ID
        : srcAddr
    const dstID = this.hasResource(dstAddr)
      ? this.getResource(dstAddr)?.id || dstAddr
      : dstIsAwsIp
        ? AWS_SERVICES_ID
        : dstAddr
    this.addDependency({
      from: srcID,
      to: dstID,
      relationship: 'connects to',
    })
    // Skip self-dependencies
    if (srcID === dstID) return

    if (!this.dependencyMap.has(srcID)) {
      this.dependencyMap.set(srcID, new Set())
    }

    if (!this.dependencyMap.get(srcID)?.has(dstID)) {
      this.dependencies.push({
        from: srcID,
        to: dstID,
        relationship: 'connects to',
      })
      this.dependencyMap.get(srcID)?.add(dstID)
    }
  }
  private async processLogs(logs: FormattedLogResult[]) {
    try {
      const awsIpChecker = AwsIpRangeManager.getInstance()
      await awsIpChecker.initialize()

      const uniqueIps = new Set<string>()
      logs.forEach((log) => {
        if (log.srcAddr) uniqueIps.add(log.srcAddr)
        if (log.dstAddr) uniqueIps.add(log.dstAddr)
      })

      // get DNS info for all unknown and non aws ips
      await retrieveDNSInfo(uniqueIps)
      logs.forEach((log) => this.processConnection(log.srcAddr, log.dstAddr))

      console.log(`Total resources identified: ${this.resourceCount()}`)
      console.log(`Total dependencies: ${this.dependencyCount()}`)
    } catch (error) {
      console.log('error occured while processing logs')
      return
    }
  }
}



  export async function describe_ec2s(
     vpcId: string,
     region: string
  ){
    const resourceMetadata : ResourceMetaData = ResourceMetaData.getInstance()

    const ec2Client = new EC2Client();

    const commandInput: DescribeInstancesCommandInput = {
        Filters: [{
            Name: "vpc-id",
            Values: [vpcId],  // Filter instances by VPC ID
        }],
    };

    try {
        // Sending the DescribeInstances request
        const data = await ec2Client.send(new DescribeInstancesCommand(commandInput));

         // Extract EC2 Instances from the response and populate the resource map
        data.Reservations?.forEach(reservation => {
            reservation.Instances?.forEach(instance => {
                const instanceId = instance.InstanceId;
                const privateIp = instance.PrivateIpAddress;

                // Retrieve the Name tag from the instance's tags
                const nameTag = instance.Tags?.find(tag => tag.Key === "Name")?.Value || "No Name Tag";

                // Add the resource to the map using the IP address as the key
                if (privateIp) {
                    resourceMetadata.setResource(privateIp, { id: instanceId!, type: 'EC2', name: nameTag });
                }
            });
        });
    } catch (error) {
        console.error("Error describing EC2 instances:", error);
    }
    console.log(resourceMetadata)

 }

 export class DnsResolver {
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
 
   // Fetch the PTR record for an IP.
   // A PTR record is a reverse DNS lookup returning the hostname for an IP.
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
 
       // If we get a response, return the hostname
       if (data.Answer && data.Answer.length > 0) {
         return data.Answer[0].data
       } else {
         // If we don't get a response, return the IP
         return ip
       }
     } catch (error) {
       console.error(`Error resolving hostname for IP ${ip}:`, error)
       // Return the IP if lookup failed
       return ip
     }
   }
 
   // Get the resource name for an IP
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
 
 // Retrieve DNS info for a set of IPs
 export async function retrieveDNSInfo(uniqueIps: Set<string>) {
   const dnsResolver = DnsResolver.getInstance()
   const resourceMetadata = ResourceMetaData.getInstance()
   const dnsResolutionPromises: Promise<void>[] = []
   const awsIpChecker = AwsIpRangeManager.getInstance()
   await awsIpChecker.initialize()
   // keep track of unique ips that we are processing to ensure we are not entering an ip into the queue multiple times
   const processingIps = new Set<string>()
 
   for (const ip of uniqueIps) {
     if (
       !awsIpChecker.isAwsIp(ip) &&
       !resourceMetadata.hasResource(ip) &&
       !processingIps.has(ip)
     ) {
       processingIps.add(ip)
 
       dnsResolutionPromises.push(
         dnsResolver
           .resolveIp(ip)
           .then((hostname) => {
             const name = dnsResolver.getResourceName(ip, hostname)
             const type = hostname !== ip ? 'Domain' : 'IP'
             resourceMetadata.setResource(ip, {
               id: ip,
               type,
               name,
             })
           })
           .catch((err) => {
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
 
 
 export async function describe_rdss(
  vpcId: string,
  region: string
){
 const resourceMetadata: ResourceMetaData = ResourceMetaData.getInstance();

 const rdsClient = new RDSClient(process.env.ENVIRONMENT == "tst" ? awsConfig : {});

 try {
     const data = await rdsClient.send(new DescribeDBInstancesCommand({}));
     const instances = data.DBInstances || [];

     // Build an array of async tasks
     const tasks = instances
       .filter(instance => instance.DBSubnetGroup?.VpcId === vpcId && instance.DBInstanceIdentifier)
       .map(async instance => {
         const instanceId = instance.DBInstanceIdentifier!;
         const endpoint = instance.Endpoint?.Address;

         if (endpoint) {
           try {
             const dnsResult = await invokeDnsLookupLambda(endpoint);
               const resolvedIp = JSON.parse(dnsResult.body).address;
             if (resolvedIp) {
               resourceMetadata.setResource(resolvedIp, { id: instanceId, type: 'RDS', name: instanceId });
             } else {
               resourceMetadata.setResource(endpoint, { id: instanceId, type: 'RDS', name: instanceId });
             }
           } catch (dnsError) {
             console.error(`DNS lookup failed for endpoint ${endpoint}:`, dnsError);
             resourceMetadata.setResource(endpoint, { id: instanceId, type: 'RDS', name: instanceId });
           }
         } else {
           resourceMetadata.setResource(instanceId, { id: instanceId, type: 'RDS', name: instanceId });
         }
       });

     // Wait for all lookups to complete
     await Promise.all(tasks);

   } catch (error) {
     console.error("Error describing RDS instances:", error);
   }

   console.log(resourceMetadata);
}

export async function invokeLambda(functionName: string, payload: any): Promise<any> {
  const lambdaClient = new LambdaClient(process.env.ENVIRONMENT == "tst" ? awsConfig : {});
  const command = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: "RequestResponse",
    Payload: new TextEncoder().encode(JSON.stringify(payload)),
  });
  const response = await lambdaClient.send(command);
  if (response.Payload) {
    const responseString = new TextDecoder().decode(response.Payload);
    return JSON.parse(responseString);
  }
  return null;
}

export async function invokeDnsLookupLambda(domain: string): Promise<any> {
  return await invokeLambda("dnsLookupLambda", { domain });
}