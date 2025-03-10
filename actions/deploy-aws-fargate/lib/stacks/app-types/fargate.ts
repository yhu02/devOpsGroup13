import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as events from 'aws-cdk-lib/aws-events';
import * as events_targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53_targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { BatchFargateStack } from '../deploy-batch-fargate-stack';
import { createEnvironmentVariablesForMainContainer } from '../reusable-components/createEnvironmentVariablesForMainContainer';
import { addContainerToFargateCluster } from '../reusable-components/deploy';
import { getOrCreateEcsExecutionRole } from '../reusable-components/EcsExecutionRole';
import { createEcsVolumeIfUsingEFS } from '../reusable-components/efs';
import { getOrCreateLogGroup } from '../reusable-components/logGroup';
import { createTaskRole } from '../reusable-components/taskRole';
export const DEFAULT_AWS_REGION = 'eu-central-1';

interface AutobahnFargateProps {
  expose2APIM: boolean;
  reuseALB: boolean;
  useEFS: boolean;
  otap: string;
  environmentVariables: string;
  ecsEphemeralStorage: number;
  cpu: number;
  memory: number;
  containerPort: number;
  version: string;
  environment: string;
  verboseOutput: string;
  ecsContainerInsights: boolean;
  ecsCircuitBreakerRollback: boolean;
  targetGroupHealthCheckPath: string;
  targetGroupHealthCheckInterval: number;
  targetGroupHealthCheckTimeout: number;
  useNginxProxy: boolean;
  NginxProxyImage: string;
  scheduledTask: boolean;
  jobSchedule: string;
  mainEntrypoint: string;
  taskEntrypoint: string;
  jobNotificationTopic: string;
  containerHealthCheckInterval: number;
  containerHealthCheckRetries: number;
  containerHealthCheckStartPeriod: number;
  containerHealthCheckTimeout: number;
  containerHealthCheckCmd: string;
  useBAR: boolean;
  useCDB: boolean;
  useAMB: boolean;
  useHANA: boolean;
  useSpot: boolean;
  useAPIM: boolean;
  apimHost: string;
  useSnowflake: boolean;
  snowflakeHost: string;
  ecsHealthCheckGracePeriod: number;
  ec2ALBListenerRulePrio: number;
  minContainers: number;
  maxContainers: number;
  asgTargetValue: number;
  loadBalancerPort: number;
  rdsSecurityGroupId: string;
  rdsDbName: string;
  taskRoleArn: string;
  stsClientId: string;
  s3ApplicationDataBucketArn: string;
  repositoryName: string;
}

export function createFargateStack(stack: BatchFargateStack, props: AutobahnFargateProps) {
  // Common resources (batch/fargate)
  const vpc = ec2.Vpc.fromLookup(stack, 'VPC', {
    vpcId: ssm.StringParameter.valueFromLookup(stack, '/platform/v1/vpc/id'),
  });

  const taskRole = props.taskRoleArn
    ? iam.Role.fromRoleArn(stack, 'TaskRole', props.taskRoleArn)
    : createTaskRole(stack) as iam.Role;

  let applicationDataBucketName: string = '';
  if (props.s3ApplicationDataBucketArn) {
    const applicationDataBucket = s3.Bucket.fromBucketArn(stack, 'ApplicationDataBucket', props.s3ApplicationDataBucketArn);
    applicationDataBucketName = applicationDataBucket.bucketName;
    applicationDataBucket.grantReadWrite(taskRole);
  }
  // RDS setup
  const useRDS = props.rdsSecurityGroupId.length > 0;
  const rdsSecurityGroup = useRDS
    ? ec2.SecurityGroup.fromSecurityGroupId(stack, 'rdsSecurityGroup', props.rdsSecurityGroupId)
    : undefined;

  // ECS setup
  const ecsVolumes: Array<ecs.Volume> = createEcsVolumeIfUsingEFS(stack, props.useEFS, props.otap);
  // Enable ECS execution role policy for tst environment (CloudShell)
  if (props.environment === 'tst') {
    createECSExecRolePolicyAndAppendToTaskRole(stack, taskRole);
  }
  const ecsContainerInsights = props.ecsContainerInsights;


  const ecrRepository = ecr.Repository.fromRepositoryName(stack, 'Repository', props.repositoryName);
  const executionRole = getOrCreateEcsExecutionRole(stack, ecrRepository, false);
  const taskDefinition = createTaskDefinition(stack, taskRole, executionRole, ecsVolumes, props.ecsEphemeralStorage, props.cpu, props.memory);
  const externalIntegrationSecrets = createExternalIntegrationSecrets(
    stack,
    taskRole,
    props.useBAR,
    props.useCDB,
    props.useAMB,
    props.useHANA,
    useRDS,
    props.rdsDbName,
  );
  const containerSecrets: Record<string, ecs.Secret> = { ...externalIntegrationSecrets };
  const logGroup = getOrCreateLogGroup(stack, false);
  const environmentVariablesForMainContainer = createEnvironmentVariablesForMainContainer(
    stack,
    props.environment,
    props.otap,
    props.environmentVariables,
    applicationDataBucketName,
    props.stsClientId,
  );
  const environmentVariableList: Record<string, string> = { ...environmentVariablesForMainContainer };
  const containerHealthCheck: ecs.HealthCheck = prepareEcsContainerHealthCheck(
    props.containerHealthCheckInterval,
    props.containerHealthCheckRetries,
    props.containerHealthCheckStartPeriod,
    props.containerHealthCheckTimeout,
    props.containerHealthCheckCmd,
  );

  const allContainers: ecs.ContainerDefinition[] = [];

  const mainContainer = addContainerToFargateCluster(
    stack,
    taskDefinition,
    containerHealthCheck,
    props.containerPort,
    ecrRepository,
    props.version,
    logGroup,
    environmentVariableList,
    props.otap,
    props.environment,
    containerSecrets,
    props.useEFS,
    props.useNginxProxy,
    props.NginxProxyImage,
    props.mainEntrypoint,
  );
  allContainers.push(mainContainer);

  if (props.stsClientId && props.useAPIM) {
    const apimSidecar = appendSidecarContainerToTaskDefinition(
      stack,
      logGroup,
      taskDefinition,
      props.stsClientId,
      props.verboseOutput,
      {
        name: 'apim',
        ingressHost: props.apimHost,
      },
    );
    allContainers.push(apimSidecar);
    createAndMountVolume([apimSidecar], 'tmp-apim', '/tmp');
  }

  if (props.stsClientId && props.useSnowflake) {
    const snowFlakeSidecar = appendSidecarContainerToTaskDefinition(
      stack,
      logGroup,
      taskDefinition,
      props.stsClientId,
      props.verboseOutput,
      {
        name: 'snowflake',
        ingressHost: props.snowflakeHost,
      },
    );
    allContainers.push(snowFlakeSidecar);
    createAndMountVolume([snowFlakeSidecar], 'tmp-snowflake', '/tmp');
  }

  // Add /tmp volume to the container so that the container can write to /tmp
  // Make sure that the container user (e.g. appuser) has write permissions to /tmp (Dockerfile)
  createAndMountVolume([mainContainer], 'tmp-main', '/tmp');

  // Allow ECS exec to work on the container
  // https://github.com/aws/containers-roadmap/issues/1359
  // Only root should be able to ECS exec on the container, so appuser doesn't have to have permissions to these paths
  if(props.environment === 'tst') {
    createAndMountVolume([mainContainer], 'var-lib-amazon-ssm', '/var/lib/amazon/ssm');
    createAndMountVolume([mainContainer], 'var-log-amazon-ssm', '/var/log/amazon/ssm');
    createAndMountVolume([mainContainer], 'managed-agents', '/managed-agents');
  }

  // create a new security group for the ECS task
  // Because we can't add extra SG's later, see: https://github.com/aws/aws-cdk/issues/5635
  const ecs_security_group = new ec2.SecurityGroup(stack, 'ecsSecurityGroup', { vpc, allowAllOutbound: true });
  // Allow all inbound traffic
  ecs_security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic(), 'Allow all inbound traffic');

  // Allow SSH (port 22)
  ecs_security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH access');

  // Store in SSM for external integrations with the ECS task
  new ssm.StringParameter(stack, `${stack.appName}ecsSecurityGroupID`, {
    parameterName: `/application/v1/${stack.appName}/ecsSecurityGroupID`,
    stringValue: ecs_security_group.securityGroupId,
  });

  const ecsCluster = createEcsCluster(stack, vpc, ecsContainerInsights);

  // Store in SSM for extra task-definitions in same cluster
  new ssm.StringParameter(stack, `${stack.appName}ClusterARN`, {
    parameterName: `/application/v1/${stack.appName}/ClusterARN`,
    stringValue: ecsCluster.clusterArn,
  });

  const targetGroupPort = props.useNginxProxy ? 8181 : props.containerPort;

  const targetGroupHealthCheck: elbv2.HealthCheck = {
    port: targetGroupPort.toString(),
    path: props.targetGroupHealthCheckPath,
    interval: cdk.Duration.seconds(props.targetGroupHealthCheckInterval),
    timeout: cdk.Duration.seconds(props.targetGroupHealthCheckTimeout),
  };

  let alb: elbv2.IApplicationLoadBalancer;
  let loadBalancedFargateService: ecs.FargateService;
  let applicationTargetGroup: elbv2.ApplicationTargetGroup;

  const hostedZone = getRoute53HostedZone(stack);

  if (props.reuseALB) {
    ({ alb, loadBalancedFargateService, applicationTargetGroup } = createFargateServiceWithExistingALB(
      stack,
      ecsCluster,
      ecs_security_group,
      props.ecsCircuitBreakerRollback,
      taskDefinition,
      targetGroupPort,
      props.ec2ALBListenerRulePrio,
      props.environment,
      rdsSecurityGroup,
    ));
  } else {
    ({ alb, loadBalancedFargateService, applicationTargetGroup } = createFargateServiceAndALB(
      stack,
      ecsCluster,
      ecs_security_group,
      props.ecsCircuitBreakerRollback,
      taskDefinition,
      props.ecsHealthCheckGracePeriod,
      props.loadBalancerPort,
      props.environment,
      rdsSecurityGroup,
    ));
  }

  // Store in SSM for external integrations with the ECS task
  new ssm.StringParameter(stack, `${stack.appName}ecsServiceARN`, {
    parameterName: `/application/v1/${stack.appName}/ecsServiceARN`,
    stringValue: loadBalancedFargateService.serviceArn,
  });

  createRoute53DnsEntry(stack, alb, hostedZone);

  applicationTargetGroup.configureHealthCheck({
    ...targetGroupHealthCheck,
  });

  configureStickySessionsAndContainerDeregistrationToALB(applicationTargetGroup);
  setFargateAutoScalingSettings(
    loadBalancedFargateService,
    props.minContainers,
    props.maxContainers,
    props.asgTargetValue,
  );

  // output some useful information into the CloudFormation stack
  writeOutputsToCloudFormationStack(stack, loadBalancedFargateService, taskDefinition, logGroup, hostedZone, taskRole);

  if (props.scheduledTask) {
    getEcsCluster(stack, vpc);
    addTask(stack, ecsCluster, taskDefinition, props.taskEntrypoint, props.jobSchedule, props.jobNotificationTopic);
  }
}

function addTask(
  stack: BatchFargateStack,
  ecsCluster: cdk.aws_ecs.ICluster,
  taskDefinition: cdk.aws_ecs.FargateTaskDefinition,
  taskEntrypoint: string,
  jobSchedule: string,
  jobNotificationTopic: string | undefined,
) {
  const containerCommand = taskEntrypoint.split(' ').filter(Boolean)

  const rule = createEventRuleForTaskAppType(stack, jobSchedule);

  rule.addTarget(
    new events_targets.EcsTask({
      cluster: ecsCluster,
      taskDefinition: taskDefinition,
      taskCount: 1,
      containerOverrides: [
        {
          containerName: 'appContainer',
          command: containerCommand,
        },
      ],
      enableExecuteCommand: true,
    }),
  );

  // Add failed job notifications if SNS topic is provided
  if (jobNotificationTopic !== '' && jobNotificationTopic !== undefined) {
    createJobNotificationRule(stack, ecsCluster, taskDefinition, jobNotificationTopic);
  }
}

function createJobNotificationRule(
  stack: BatchFargateStack,
  ecsCluster: cdk.aws_ecs.ICluster,
  taskDefinition: cdk.aws_ecs.FargateTaskDefinition,
  jobNotificationTopic: string,
) {
  new events.Rule(stack, 'NotificationRule', {
    eventPattern: {
      source: ['aws.ecs'],
      detail: {
        clusterArn: [ecsCluster.clusterArn],
        taskDefinitionArn: [taskDefinition.taskDefinitionArn],
        lastStatus: ['STOPPED'],
        stopCode: ['EssentialContainerExited'],
        containers: {
          exitCode: [
            {
              'anything-but': 0,
            },
          ],
        },
      },
      detailType: ['ECS Task State Change'],
    },
    targets: [new events_targets.SnsTopic(sns.Topic.fromTopicArn(stack, 'SNSNotificationTopic', jobNotificationTopic))],
  });
}

function writeOutputsToCloudFormationStack(
  stack: BatchFargateStack,
  loadBalancedFargateService: cdk.aws_ecs.FargateService,
  taskDefinition: cdk.aws_ecs.FargateTaskDefinition,
  logGroup: cdk.aws_logs.ILogGroup,
  hostedZone: cdk.aws_route53.IHostedZone,
  taskRole: cdk.aws_iam.IRole,
) {
  new cdk.CfnOutput(stack, 'TaskRoleArn', { value: taskRole.roleArn });

  new cdk.CfnOutput(stack, 'ClusterName', {
    value: loadBalancedFargateService.cluster.clusterName,
  });
  new cdk.CfnOutput(stack, 'TaskDefinitionFamily', {
    value: taskDefinition.family,
  });
  new cdk.CfnOutput(stack, 'TaskDefinitionTaskRole', {
    value: taskDefinition.taskRole.roleName,
  });
  new cdk.CfnOutput(stack, 'TaskDefinitionExecutionRole', {
    value: `${taskDefinition.executionRole?.roleName}`,
  });
  new cdk.CfnOutput(stack, 'TaskDefinitionLogGroup', {
    value: logGroup.logGroupName,
  });
  new cdk.CfnOutput(stack, 'EndPointURL', {
    value: `https://${stack.appName}.${hostedZone.zoneName}`,
  });
}

function configureStickySessionsAndContainerDeregistrationToALB(
  applicationTargetGroup: cdk.aws_elasticloadbalancingv2.ApplicationTargetGroup,
) {
  applicationTargetGroup.setAttribute('deregistration_delay.timeout_seconds', '60');
  applicationTargetGroup.setAttribute('stickiness.enabled', 'true');
  applicationTargetGroup.setAttribute('stickiness.type', 'lb_cookie');
}

function setFargateAutoScalingSettings(
  loadBalancedFargateService: cdk.aws_ecs.FargateService,
  minContainers: number,
  maxContainers: number,
  asgTargetValue: number, // TODO: rename this variable to something more meaningful, like cpuPercentageTargetUtilization
) {
  const scalableTarget = loadBalancedFargateService.autoScaleTaskCount({
    minCapacity: minContainers,
    maxCapacity: maxContainers,
  });
  scalableTarget.scaleOnCpuUtilization('CpuScaling', {
    targetUtilizationPercent: asgTargetValue,
    scaleInCooldown: cdk.Duration.seconds(10),
    scaleOutCooldown: cdk.Duration.seconds(10),
  });
}

function createEcsCluster(
  stack: BatchFargateStack,
  vpc: cdk.aws_ec2.IVpc,
  ecsContainerInsights: boolean,
): cdk.aws_ecs.ICluster {
  return new ecs.Cluster(stack, `${stack.appName}Cluster`, {
    clusterName: `${stack.appName}Cluster`,
    vpc,
    containerInsights: ecsContainerInsights,
  });
}

function getEcsCluster(stack: BatchFargateStack, vpc: cdk.aws_ec2.IVpc): cdk.aws_ecs.ICluster {
  return ecs.Cluster.fromClusterAttributes(stack, `${stack.appName}FargateCluster`, {
    clusterName: `${stack.appName}FargateCluster`,
    vpc,
  });
}

function appendSidecarContainerToTaskDefinition(
  stack: BatchFargateStack,
  logGroup: cdk.aws_logs.ILogGroup,
  taskDefinition: cdk.aws_ecs.FargateTaskDefinition,
  stsClientId: string,
  verboseOutput: string,
  sidecarOptions: {
    name: 'apim' | 'snowflake',
    ingressHost: string;
  },
): ecs.ContainerDefinition {
  const tokenExtAzureEndpoint = ssm.StringParameter.valueFromLookup(stack, '/platform/v1/aad/token-endpoint');
  const tokenExtStsEndpoint = ssm.StringParameter.valueFromLookup(stack, '/platform/v1/sts/token-endpoint');
  const portNumber = sidecarOptions.name === 'apim' ? 2772 : sidecarOptions.name === 'snowflake' ? 2774 : 2772;
  const proxyPortNumber = sidecarOptions.name === 'apim' ? 2773 : sidecarOptions.name === 'snowflake' ? 2775 : 2773;
  const containerName = `${sidecarOptions.name}-Sidecar`;

  const sidecarContainer = taskDefinition.addContainer(`${sidecarOptions.name}Container`, {
    containerName: containerName,
    image: ecs.ContainerImage.fromRegistry('ghcr.io/alliander-opensource/aws-jwt-sts-extension'),
    logging: new ecs.AwsLogDriver({
      streamPrefix: `ecs-${sidecarOptions.name}`,
      logGroup: logGroup,
    }),
    environment: {
      TOKEN_EXT_AZURE_ENDPOINT: tokenExtAzureEndpoint,
      TOKEN_EXT_STS_ENDPOINT: tokenExtStsEndpoint,
      TOKEN_EXT_AAD_CLIENT_ID: stsClientId,
      TOKEN_EXT_PROXY_HOST: sidecarOptions.ingressHost,
      TOKEN_EXT_DEBUG_ENABLED: verboseOutput,
      TOKEN_EXT_TOKEN_SERVER_PORT: portNumber.toString(),
      TOKEN_EXT_PROXY_SERVER_PORT: proxyPortNumber.toString(),
      // TOKEN_EXT_STS_FILENAME: `/tmp/${sidecarOptions.name}-sts-token`,
      // TOKEN_EXT_AAD_FILENAME: `/tmp/${sidecarOptions.name}-aad-token`
    },
    readonlyRootFilesystem: true,
  });

  sidecarContainer.addPortMappings({ hostPort: portNumber, containerPort: portNumber }, { hostPort: proxyPortNumber, containerPort: proxyPortNumber });

  new cdk.CfnOutput(stack, `${sidecarOptions.name}Sidecar`, {
    value: `Proxy Port: ${proxyPortNumber}, Token Port: ${portNumber}`,
  })

  return sidecarContainer;

}

function createEventRuleForTaskAppType(stack: BatchFargateStack, jobSchedule: string) {
  return new events.Rule(stack, 'Rule', {
    schedule: events.Schedule.expression(jobSchedule),
  });
}

function createRoute53DnsEntry(
  stack: BatchFargateStack,
  alb: cdk.aws_elasticloadbalancingv2.IApplicationLoadBalancer,
  hostedZone: cdk.aws_route53.IHostedZone,
) {
  return new route53.ARecord(stack, 'AliasRecord', {
    target: route53.RecordTarget.fromAlias(new route53_targets.LoadBalancerTarget(alb)),
    recordName: `${stack.appName}-alb.${hostedZone.zoneName}`,
    zone: hostedZone,
  });
}

function getRoute53HostedZone(stack: BatchFargateStack) {
  return route53.HostedZone.fromHostedZoneAttributes(stack, 'HostedZone', {
    hostedZoneId: '{{resolve:ssm:/platform/v1/dns/public/id}}',
    zoneName: '{{resolve:ssm:/platform/v1/dns/public/name}}',
  });
}

function prepareEcsContainerHealthCheck(
  containerHealthCheckInterval: number,
  containerHealthCheckRetries: number,
  containerHealthCheckStartPeriod: number,
  containerHealthCheckTimeout: number,
  containerHealthCheckCmd: string,
) {
  const containerHealthCheck: ecs.HealthCheck = {
    command: ['CMD-SHELL', containerHealthCheckCmd],
    interval: cdk.Duration.seconds(containerHealthCheckInterval),
    retries: containerHealthCheckRetries,
    startPeriod: cdk.Duration.seconds(containerHealthCheckStartPeriod),
    timeout: cdk.Duration.seconds(containerHealthCheckTimeout),
  };
  return containerHealthCheck;
}

function createTaskDefinition(
  stack: BatchFargateStack,
  taskRole: cdk.aws_iam.IRole,
  executionRole: cdk.aws_iam.Role,
  ecsVolumes: Array<cdk.aws_ecs.Volume>,
  ecsEphemeralStorage: number,
  cpu: number,
  memory: number,
) {
  const appName = stack.appName;
  return new ecs.FargateTaskDefinition(stack, `${appName}TaskDefinition`, {
    family: `${appName}Family`,
    taskRole: taskRole,
    executionRole: executionRole,
    volumes: ecsVolumes,
    ephemeralStorageGiB: ecsEphemeralStorage,
    cpu: cpu,
    memoryLimitMiB: memory,
  });
}

function createECSExecRolePolicyAndAppendToTaskRole(stack: BatchFargateStack, taskRole: cdk.aws_iam.IRole) {
  // TODO: should these ssmmessages actions also be added to the batch job role?

  const ecsExecRoleInlinePolicy = new iam.Policy(stack, 'ECSExecRoleInlinePolicy', {
    document: new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          sid: 'ECSExecRoleInlinePolicy',
          actions: [
            'ssmmessages:CreateDataChannel',
            'ssmmessages:OpenDataChannel',
            'ssmmessages:OpenControlChannel',
            'ssmmessages:CreateControlChannel',
          ],
          resources: ['*'],
        }),
      ],
    }),
  });

  taskRole.attachInlinePolicy(ecsExecRoleInlinePolicy);
}

function createFargateServiceAndALB(
  stack: BatchFargateStack,
  ecsCluster: cdk.aws_ecs.ICluster,
  ecs_security_group: cdk.aws_ec2.SecurityGroup,
  ecsCircuitBreakerRollback: boolean,
  taskDefinition: cdk.aws_ecs.FargateTaskDefinition,
  ecsHealthCheckGracePeriod: number,
  loadBalancerPort: number,
  environment: string,
  rdsSecurityGroup?: cdk.aws_ec2.ISecurityGroup,
) {
  const useSpot = stack.getBooleanFromContext('useSpot');
  const ecsCapacityProviderFargate = useSpot ? 'FARGATE_SPOT' : 'FARGATE';
  const vpc = ec2.Vpc.fromLookup(stack, 'AllianderVPC', {
    vpcId: ssm.StringParameter.valueFromLookup(stack, '/platform/v1/vpc/id'),
  });
  const privateSubnets = vpc.selectSubnets({
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
  });
  const hostedZone = route53.HostedZone.fromHostedZoneAttributes(stack, 'AllianderHostedZone', {
    hostedZoneId: '{{resolve:ssm:/platform/v1/dns/public/id}}',
    zoneName: '{{resolve:ssm:/platform/v1/dns/public/name}}',
  });
  const applicationLoadBalancedFargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(
    stack,
    `${stack.appName}ALBFargateService`,
    {
      taskDefinition,
      deploymentController: {
        type: ecs.DeploymentControllerType.ECS,
      },
      serviceName: `${stack.appName}Service`,
      securityGroups: rdsSecurityGroup ? [ecs_security_group, rdsSecurityGroup] : [ecs_security_group],
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      desiredCount: 1,
      healthCheckGracePeriod: cdk.Duration.seconds(ecsHealthCheckGracePeriod),
      circuitBreaker: { rollback: ecsCircuitBreakerRollback },
      cluster: ecsCluster,
      taskSubnets: privateSubnets,
      capacityProviderStrategies: [{ capacityProvider: ecsCapacityProviderFargate, weight: 1 }],
      domainName: `${stack.appName}-alb`,
      domainZone: hostedZone,
      recordType: ecs_patterns.ApplicationLoadBalancedServiceRecordType.NONE,
      listenerPort: loadBalancerPort,
      enableExecuteCommand: environment === 'tst',
    },
  );

  const alb = applicationLoadBalancedFargateService.loadBalancer;
  const applicationTargetGroup = applicationLoadBalancedFargateService.targetGroup;
  const loadBalancedFargateService = applicationLoadBalancedFargateService.service;

  return { loadBalancedFargateService, alb, applicationTargetGroup };
}

function createFargateServiceWithExistingALB(
  stack: BatchFargateStack,
  ecsCluster: cdk.aws_ecs.ICluster,
  ecs_security_group: cdk.aws_ec2.SecurityGroup,
  ecsCircuitBreakerRollback: boolean,
  taskDefinition: cdk.aws_ecs.FargateTaskDefinition,
  targetGroupPort: number,
  applicationListenerRuleLastPrio: number,
  environment: string,
  rdsSecurityGroup?: cdk.aws_ec2.ISecurityGroup,
) {
  // PARAMETERS
  const ecsHealthCheckGracePeriod = stack.getIntFromContext('ecsHealthCheckGracePeriod');
  const alb = getReusableALB(stack);
  const albListener = getReusableALBListener(stack);
  const hostedZone = route53.HostedZone.fromHostedZoneAttributes(stack, 'AllianderHostedZone', {
    hostedZoneId: '{{resolve:ssm:/platform/v1/dns/public/id}}',
    zoneName: '{{resolve:ssm:/platform/v1/dns/public/name}}',
  });

  // AANMAKEN
  const loadBalancedFargateService = new ecs.FargateService(stack, `${stack.appName}ALBFargateService`, {
    cluster: ecsCluster,
    securityGroups: rdsSecurityGroup ? [ecs_security_group, rdsSecurityGroup] : [ecs_security_group],
    healthCheckGracePeriod: cdk.Duration.seconds(ecsHealthCheckGracePeriod),
    deploymentController: {
      type: ecs.DeploymentControllerType.ECS,
    },
    circuitBreaker: { rollback: ecsCircuitBreakerRollback },
    taskDefinition,
    enableExecuteCommand: environment === 'tst',
  });
  const applicationTargetGroup = new elbv2.ApplicationTargetGroup(stack, `${stack.appName}TargetGroup`, {
    port: targetGroupPort,
    protocol: elbv2.ApplicationProtocol.HTTP,
    targetType: elbv2.TargetType.IP,
    vpc: ecsCluster.vpc,
  });
  loadBalancedFargateService.attachToApplicationTargetGroup(applicationTargetGroup);
  new elbv2.ApplicationListenerRule(stack, 'CommonALBListenerRule', {
    listener: albListener,
    priority: applicationListenerRuleLastPrio,
    conditions: [elbv2.ListenerCondition.hostHeaders([`${stack.appName}-alb.${hostedZone.zoneName}`])],
    targetGroups: [applicationTargetGroup],
  });

  // SIDE EFFECT
  new ssm.StringParameter(stack, `${stack.appName}ALBListenerRulePrio`, {
    parameterName: `/application/v1/${stack.appName}/ApplicationLoadBalancerListenerRulePrio`,
    stringValue: applicationListenerRuleLastPrio.toString(),
  });

  return { alb, loadBalancedFargateService, applicationTargetGroup };
}

function getReusableALB(stack: BatchFargateStack) {
  return elbv2.ApplicationLoadBalancer.fromLookup(stack, 'CommonALB', {
    loadBalancerArn: ssm.StringParameter.valueFromLookup(stack, '/application/v1/common/ApplicationLoadBalancerARN'),
  });
}

function getReusableALBListener(stack: BatchFargateStack) {
  return elbv2.ApplicationListener.fromLookup(stack, 'CommonALBListener', {
    listenerArn: ssm.StringParameter.valueFromLookup(
      stack,
      '/application/v1/common/ApplicationLoadBalancerListenerARN',
    ),
  });
}


function createExternalIntegrationSecrets(
  stack: BatchFargateStack,
  taskRole: cdk.aws_iam.IRole,
  useBAR: boolean,
  useCDB: boolean,
  useAMB: boolean,
  useHANA: boolean,
  useRDS: boolean,
  rdsDbName: string = `Db${stack.appName.replace(/[^ a-z0-9]/gi, '')}`,
) {
  const containerSecrets: { [key: string]: ecs.Secret } = {};
  if (useHANA) {
    containerSecrets['HANA_DB_INSTANCE'] = createSecret(stack, 'hana', 'INSTANCE');
    containerSecrets['HANA_DB_USERNAME'] = createSecret(stack, 'hana', 'USERNAME');
    containerSecrets['HANA_DB_PASSWORD'] = createSecret(stack, 'hana', 'PASSWORD');
  }
  if (useBAR) {
    containerSecrets['BAR_DB_INSTANCE'] = createSecret(stack, 'bar', 'INSTANCE');
    containerSecrets['BAR_DB_USERNAME'] = createSecret(stack, 'bar', 'USERNAME');
    containerSecrets['BAR_DB_PASSWORD'] = createSecret(stack, 'bar', 'PASSWORD');
  }
  if (useCDB) {
    containerSecrets['CDB_DB_INSTANCE'] = createSecret(stack, 'cdb', 'INSTANCE');
    containerSecrets['CDB_DB_USERNAME'] = createSecret(stack, 'cdb', 'USERNAME');
    containerSecrets['CDB_DB_PASSWORD'] = createSecret(stack, 'cdb', 'PASSWORD');
  }
  if (useAMB) {
    containerSecrets['AMB_DB_INSTANCE'] = createSecret(stack, 'amb', 'INSTANCE');
    containerSecrets['AMB_DB_USERNAME'] = createSecret(stack, 'amb', 'USERNAME');
    containerSecrets['AMB_DB_PASSWORD'] = createSecret(stack, 'amb', 'PASSWORD');
  }
  if (useRDS) {
    const rdsSecretARN = cdk.aws_ssm.StringParameter.valueForStringParameter(stack, `/db/${rdsDbName}/secretArn`);
    const rdsSecret = cdk.aws_secretsmanager.Secret.fromSecretCompleteArn(stack, 'rdsSecret', rdsSecretARN);

    // IAM and policies
    taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonRDSFullAccess'));
    rdsSecret.grantRead(taskRole);

    // Database Container Secrets
    containerSecrets['RDS_DB_INSTANCE'] = ecs.Secret.fromSsmParameter(
      ssm.StringParameter.fromSecureStringParameterAttributes(stack, 'RDSINSTANCEParam', {
        parameterName: `/db/${rdsDbName}/hostname`,
      }),
    );
    containerSecrets['RDS_DB_SECRET_ARN'] = ecs.Secret.fromSsmParameter(
      ssm.StringParameter.fromSecureStringParameterAttributes(stack, 'RDSSecretArnParam', {
        parameterName: `/db/${rdsDbName}/secretArn`,
      }),
    );
    containerSecrets['RDS_DB_USERNAME'] = ecs.Secret.fromSecretsManager(rdsSecret, 'username');
    containerSecrets['RDS_DB_PASSWORD'] = ecs.Secret.fromSecretsManager(rdsSecret, 'password');
    containerSecrets['RDS_DB_NAME'] = ecs.Secret.fromSecretsManager(
      new cdk.aws_secretsmanager.Secret(stack, 'RDSDBNameSecret', {
        secretStringValue: cdk.SecretValue.unsafePlainText(rdsDbName),
      })
    );   
  }
    
    return containerSecrets;
}

function createSecret(
  stack: BatchFargateStack,
  datasourceName: string,
  secretType: 'INSTANCE' | 'USERNAME' | 'PASSWORD',
): ecs.Secret {
  const capitalizedDatasourceName = `${datasourceName.charAt(0).toUpperCase()}${datasourceName.slice(1)}`;
  const parameterName = `/application/v1/${stack.appName}/secrets/${datasourceName.toUpperCase()}/DB_${secretType}`;
  return ecs.Secret.fromSsmParameter(
    ssm.StringParameter.fromSecureStringParameterAttributes(stack, `${capitalizedDatasourceName}${secretType}Param`, {
      parameterName,
    }),
  );
}

const addedVolumes = new Set<string>();

export function createAndMountVolume(
  containers: cdk.aws_ecs.ContainerDefinition[],
  volumeName: string,
  containerPath: string,
  readOnly: boolean = false,
) {

  containers.forEach((container) => {
    const taskDefinition = container.taskDefinition;

    // Check if the volume has already been added
    if (!addedVolumes.has(volumeName)) {
      taskDefinition.addVolume({
        name: volumeName,
      });
      addedVolumes.add(volumeName);
    }

    container.addMountPoints({
      containerPath: containerPath,
      sourceVolume: volumeName,
      readOnly: readOnly,
    });
  });

}
