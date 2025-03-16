export declare const AWS_IP_RANGES_URL = "https://ip-ranges.amazonaws.com/ip-ranges.json";
export interface AwsResource {
    id: string;
    type: string;
    name: string;
}
export interface Dependency {
    from: string;
    to: string;
    relationship: string;
}
export interface FormattedLogResult {
    [key: string]: string;
}
export declare const AWS_SERVICES_ID = "aws-services";
export interface CloudWatchQueryConfig {
    logGroupNames: string[];
    queryString: string;
    startTime: Date;
    endTime: Date;
    limit: number;
}
export interface AwsResource {
    id: string;
    type: string;
    name: string;
}
export interface Dependency {
    from: string;
    to: string;
    relationship: string;
}
export interface CloudWatchQueryConfig {
    logGroupNames: string[];
    queryString: string;
    startTime: Date;
    endTime: Date;
    limit: number;
}
