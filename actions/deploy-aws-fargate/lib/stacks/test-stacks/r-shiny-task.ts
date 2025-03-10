import { AppContext } from '../../types';
import { DUMMY_ARN } from '../../constants';

export default {
  stackName: 'automatische-klantinpassing-ac5-tool',
  rollBack: 'true',
  appName: 'automatische-klantinpassing-ac5-tool',
  appType: 'shiny-task',
  baseImagesAccountId: '767398142180',
  useSpot: 'true',
  ecsCircuitBreakerRollback: 'true',
  ecsHealthCheckGracePeriod: '0',
  containerPort: '8080',
  minContainers: '2',
  maxContainers: '2',
  reuseALB: 'true',
  ec2ALBListenerRulePrio: '4',
  targetGroupHealthCheckPath: '/index.html',
  targetGroupHealthCheckInterval: '30',
  targetGroupHealthCheckTimeout: '5',
  containerHealthCheckCmd: 'curl -f http://localhost:8080/index.html || exit 1',
  containerHealthCheckInterval: '300',
  containerHealthCheckTimeout: '60',
  containerHealthCheckRetries: '3',
  containerHealthCheckStartPeriod: '0',
  loadBalancerPort: '443',
  asgTargetValue: '50',
  useHANA: 'true',
  useBAR: 'false',
  useCDB: 'false',
  useAMB: 'false',
  expose2APIM: 'true',
  apimHost: 'api.alliander.com',
  cpu: '8192',
  memory: '16384',
  environment: 'prd',
  otap: 'P',
  environmentVariables: "env1;env2;env3",
  useEFS: 'true',
  version: '2.0.0.9059',
  jobSchedule: 'cron(0 1 * * ? *)',
  jobNotificationTopic: '',
  mainEntrypoint: '',
  taskEntrypoint: 'Rscript /srv/job.R default ',
  verboseOutput: 'false',
  rdsSecurityGroupId: 'test-rds-security-group-id',
  repo: 'Alliander/Autobahn',
  branch: 'branch',
  commitSha: '1234',
  taskRoleArn: DUMMY_ARN,
  stsClientId: 'test-client-id',
  s3ApplicationDataBucketArn: DUMMY_ARN,
} satisfies AppContext;
