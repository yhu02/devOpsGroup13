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
