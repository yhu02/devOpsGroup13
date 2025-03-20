import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';

import { BatchFargateStack } from '../deploy-batch-fargate-stack';

/**
 * Add a container to a fargate cluster
 * @param stack the stack that the container will be added to
 * @param taskDefinition the task definition that the container will be added to
 * @param containerHealthCheck the health check for the container
 * @param containerPort the port that the container will be listening on
 * @param ecrRepository the ecr repository that the container image will be pulled from
 * @param version the version of the container image
 * @param logGroup the log group that the container will log to
 * @param environment the environment that the container will be running in
 * @param otap the otap that the container will be running in
 * @param containerSecrets the secrets that the container will have access to
 * @param useEFS whether or not the container will be using EFS
 * @param useNginxProxy whether or not the container will be using an nginx proxy
 * @param NginxProxyImage The ARN of the nginx proxy image
 * @param mainEntrypoint the entrypoint for the main container
 * @returns container definition
 */

export function addContainerToFargateCluster(
  stack: BatchFargateStack,
  taskDefinition: cdk.aws_ecs.FargateTaskDefinition,
  containerHealthCheck: cdk.aws_ecs.HealthCheck,
  containerPort: number,
  ecrRepository: cdk.aws_ecr.IRepository,
  version: string,
  logGroup: cdk.aws_logs.ILogGroup,
  environmentVariableList: Record<string, string>,
  otap: string,
  environment: string,
  containerSecrets: Record<string, cdk.aws_ecs.Secret>,
  useEFS: boolean,
  useNginxProxy: boolean,
  NginxProxyImage: string,
  mainEntrypoint: string,
): ecs.ContainerDefinition {
  if (useNginxProxy) {
    const nginxContainer = taskDefinition.addContainer('NGINXContainer', {
      containerName: 'NGINX-Proxy',
      image: ecs.ContainerImage.fromRegistry(`${NginxProxyImage}`),
      readonlyRootFilesystem: true,
      logging: new ecs.AwsLogDriver({ streamPrefix: 'ecs-nginx' }),
      healthCheck: undefined,
    });

    nginxContainer.addPortMappings({
      hostPort: 8181,
      containerPort: 8181,
    });
  }

  // Add main container
  const mainContainer = taskDefinition.addContainer(`${stack.appName}MainContainer`, {
    containerName: 'appContainer',
    image: ecs.ContainerImage.fromEcrRepository(ecrRepository, version),
    command: mainEntrypoint.split(' ').filter(Boolean), // Split the command string into an array of strings
    essential: true,
    linuxParameters:
      environment === 'tst'
        ? new ecs.LinuxParameters(stack, 'LinuxParameters', {
            initProcessEnabled: true,
          })
        : undefined,
    readonlyRootFilesystem: true,
    logging: new ecs.AwsLogDriver({
      streamPrefix: 'fargate',
      logGroup: logGroup,
    }),
    environment: environmentVariableList,
    secrets: containerSecrets,
    healthCheck: containerHealthCheck,
  });

  mainContainer.addPortMappings({
    hostPort: containerPort,
    containerPort: containerPort,
  });

  if (useEFS) {
    mainContainer.addMountPoints({
      containerPath: `/data/static/${otap}/${stack.appName}`,
      readOnly: false,
      sourceVolume: 'efs-data',
    });
  }
  return mainContainer;
}
