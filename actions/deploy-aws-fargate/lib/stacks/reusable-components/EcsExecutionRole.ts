import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { BatchFargateStack } from '../deploy-batch-fargate-stack';

export function getOrCreateEcsExecutionRole(
  stack: BatchFargateStack,
  ecrRepository: cdk.aws_ecr.IRepository,
  scheduledTaskOnly: boolean,
) {
  const appName = stack.appName;
  const executionRole = new iam.Role(stack, `${appName}ExecutionRole`, {
    assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
  });

  // We can remove this after we got rid of the setup-batch-jobdefinition action (and it's CDK stack)
  if (!scheduledTaskOnly) {
    // Store in SSM
    new ssm.StringParameter(stack, `${appName}ExecutionRoleARN`, {
      parameterName: `/application/v1/${appName}/ExecutionRoleARN`,
      stringValue: executionRole.roleArn,
    });
  }

  executionRole.addManagedPolicy(
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
  );

  ecrRepository.grantPull(executionRole);
  return executionRole;
}
