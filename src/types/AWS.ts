export interface AwsResource {
  id: string
  type: string // e.g., "VPC" or "RDS"
  name: string // human-readable name for display
}

export interface Dependency {
  from: string // id of the source resource
  to: string // id of the target resource
  relationship: string // e.g., "contains", "connects to"
}
export interface FormattedLogResult {
  [key: string]: string
}
export const AWS_SERVICES_ID = 'aws-services' // AWS IP ranges official JSON URL

export const AWS_IP_RANGES_URL =
  'https://ip-ranges.amazonaws.com/ip-ranges.json'

export interface CloudWatchQueryConfig {
  logGroupNames: string[]
  queryString: string
  startTime: Date
  endTime: Date
  limit: number
}
