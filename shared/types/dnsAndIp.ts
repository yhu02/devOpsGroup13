export interface DnsResponse {
  Status: number
  Answer?: Array<{
    name: string
    type: number
    TTL: number
    data: string
  }>
}
export interface AwsIpRanges {
  createDate: string
  prefixes: Array<AwsIpRangeEntry>
  ipv6_prefixes: Array<any>
}
export interface AwsIpRangeEntry {
  ip_prefix: string
  region: string
  service: string
  network_border_group: string
}
