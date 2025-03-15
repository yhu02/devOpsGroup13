
export interface DnsResponse {
  Status: number;
  Answer?: {
    name: string;
    type: number;
    TTL: number;
    data: string;
  }[];
}export interface AwsIpRanges {
  createDate: string
  prefixes: AwsIpRangeEntry[]
  ipv6_prefixes: any[]
}
export interface AwsIpRangeEntry {
  ip_prefix: string
  region: string
  service: string
  network_border_group: string
}

