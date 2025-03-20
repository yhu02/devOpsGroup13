export type AppContext = Partial<{
  stackName: string;
  rollBack: string | boolean;
  appName: string;
  appType: KnownFargateAppTypes | KnownFargateTaskTypes;
  baseImagesAccountId: string;
  useSpot: string | boolean;
  ecsCircuitBreakerRollback: string | boolean;
  ecsHealthCheckGracePeriod: string | number;
  containerPort: string | number;
  minContainers: string | number;
  maxContainers: string | number;
  reuseALB: string | boolean;
  ec2ALBListenerRulePrio: string | number;
  targetGroupHealthCheckPath: string;
  targetGroupHealthCheckInterval: string | number;
  targetGroupHealthCheckTimeout: string | number;
  containerHealthCheckCmd: string;
  containerHealthCheckInterval: string | number;
  containerHealthCheckTimeout: string | number;
  containerHealthCheckRetries: string | number;
  containerHealthCheckStartPeriod: string | number;
  loadBalancerPort: string | number;
  asgTargetValue: string | number;
  useHANA: string | boolean;
  useBAR: string | boolean;
  useCDB: string | boolean;
  useAMB: string | boolean;
  useSnowflake: string | boolean;
  useAPIM: string | boolean;
  expose2APIM: string | boolean;
  apimHost: string;
  ecsEphemeralStorage: string | number;
  cpu: string | number;
  memory: string | number;
  environment: 'tst' | 'acc' | 'prd';
  otap: 'O' | 'T' | 'A' | 'P';
  environmentVariables: string;
  useEFS: string | boolean;
  version: string;
  jobSchedule: string;
  jobNotificationTopic: string;
  mainEntrypoint: string;
  taskEntrypoint: string;
  verboseOutput: string | boolean;
  rdsSecurityGroupId: string;
  rdsDbName: string;
  repo: string;
  branch: string;
  commitSha: string;
  taskRoleArn: string;
  stsClientId: string;
  s3ApplicationDataBucketArn: string;
  repositoryName: string;
}>;

export type ComputeEnv = 'FARGATE' | 'EC2';

export const knownFargateAppTypes = [
  'shiny',
  'streamlit',
  'fastapi',
  'frontend',
  'shiny-task',
  'streamlit-task',
  'fastapi-task',
] as const;
export const knownFargateTaskTypes = ['shiny-task', 'streamlit-task', 'fastapi-task'] as const;

export const allAppTypes = [...knownFargateAppTypes, ...knownFargateTaskTypes] as Array<string>;

export type KnownFargateAppTypes = (typeof knownFargateAppTypes)[number];
export type KnownFargateTaskTypes = (typeof knownFargateTaskTypes)[number];
