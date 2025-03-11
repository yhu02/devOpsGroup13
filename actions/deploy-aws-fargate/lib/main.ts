import * as cdk from 'aws-cdk-lib';

import { DUMMY_ARN } from './constants';
import { BatchFargateStack } from './stacks/deploy-batch-fargate-stack';
import { AppContext } from './types';
import { CdkGraph } from '@aws/pdk/cdk-graph';
import { CdkGraphDiagramPlugin } from '@aws/pdk/cdk-graph-plugin-diagram';

(async () => {
  const app = new cdk.App({
    // Setting default context variables in the CDK App (can be overridden via --context argument in cli)
    context: {
      stackName: 'autobahn-fahrgestell-test-python-streamlit',
      rollBack: 'true',
      appName: 'autobahn-fahrgestell-test-python-streamlit',
      appType: 'streamlit',
      baseImagesAccountId: '767398142180',
      useSpot: 'true',
      ecsCircuitBreakerRollback: 'true',
      ecsHealthCheckGracePeriod: '0',
      containerPort: '8080',
      minContainers: '1',
      maxContainers: '1',
      reuseALB: 'true',
      ec2ALBListenerRulePrio: '1',
      targetGroupHealthCheckPath: 'Auto',
      targetGroupHealthCheckInterval: '30',
      targetGroupHealthCheckTimeout: '5',
      containerHealthCheckCmd: 'Auto',
      containerHealthCheckInterval: '30',
      containerHealthCheckTimeout: '5',
      containerHealthCheckRetries: '3',
      containerHealthCheckStartPeriod: '0',
      loadBalancerPort: '443',
      asgTargetValue: '50',
      useHANA: 'false',
      useBAR: 'false',
      useCDB: 'false',
      useAMB: 'false',
      useSnowflake: 'false',
      useAPIM: 'false',
      expose2APIM: 'false',
      apimHost: 'tst-api.alliander.com',
      ecsEphemeralStorage: '21',
      cpu: '256',
      memory: '512',
      environment: 'tst',
      otap: 'T',
      environmentVariables: '',
      useEFS: 'true',
      version: '0.1.3',
      jobSchedule: '',
      jobNotificationTopic: '',
      mainEntrypoint: 'run_application -m default',
      taskEntrypoint: 'run_application -m job -j default',
      verboseOutput: 'true',
      rdsSecurityGroupId: '',
      rdsDbName: '',
      branch: 'branch',
      repo: 'Alliander/Autobahn',
      commitSha: '1234',
      taskRoleArn: DUMMY_ARN,
      stsClientId: 'test-client-id',
      s3ApplicationDataBucketArn: DUMMY_ARN,
      repositoryName: 'cloudvisualizer'
    } satisfies AppContext,
  });

  console.log(`this is the stackname: ${app.node.tryGetContext('stackName')}`);

  new BatchFargateStack(app, `${app.node.tryGetContext('stackName')}`, {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  });

  const graph = new CdkGraph(app, {
    plugins: [new CdkGraphDiagramPlugin()],
  });

  app.synth();

  // async cdk-graph reporting hook
  await graph.report();
})();
