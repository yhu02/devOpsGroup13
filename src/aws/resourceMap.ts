import {
  AWS_SERVICES_ID,
  AwsResource,
  Dependency,
  FormattedLogResult,
} from '@/types/AWS'
import { AwsIpRangeManager } from './awsIpRangeManager'
import { getVPCFlowLogs } from './cloudwatchApi'
import { retrieveDNSInfo } from './dnsResolver'
import { describe_ec2s, describe_rdss } from './resources-in-vpc'
export class ResourceMetaData {
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

    //should be handled differently
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
    const logs: FormattedLogResult[] = await getVPCFlowLogs()
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
