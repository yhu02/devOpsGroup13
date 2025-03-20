import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { BatchFargateStack } from '../deploy-batch-fargate-stack';

export function createTaskRole(stack: BatchFargateStack): iam.IRole {
  const appName = stack.appName;
  let taskRole: iam.IRole;
  // Store in SSM

  taskRole = new iam.Role(stack, `${appName}TaskRole`, {
    assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
  });

  // Add AWS managed ReadOnlyAccess policy
  taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('ReadOnlyAccess'));

  taskRole.addManagedPolicy(
    new iam.ManagedPolicy(stack, `${appName}S3AndLambdaPolicy`, {
      document: new iam.PolicyDocument({
        statements: [
          // S3 permissions
          new iam.PolicyStatement({
            actions: ['s3:PutObject', 's3:DeleteObject'],
            resources: [`arn:aws:s3:::${appName}*`, `arn:aws:s3:::${appName}*/*`],
            effect: iam.Effect.ALLOW,
          }),

          // Lambda invoke permission
          new iam.PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: ['arn:aws:lambda:*:*:function:*'],
            effect: iam.Effect.ALLOW,
          }),
        ],
      }),
    }),
  );

  // Add custom policies
  const policiesDirPath = join(process.env.GITHUB_WORKSPACE ?? '', 'infra/aws/policies');
  if (existsSync(policiesDirPath)) {
    const policyFiles = readdirSync(policiesDirPath);
    policyFiles.forEach(policyFile => {
      const policyFilePath = join(policiesDirPath, policyFile);
      const policyDocument = JSON.parse(readFileSync(policyFilePath, 'utf8'));

      console.log(`Policy file: ${policyFilePath}`);

      taskRole.addManagedPolicy(
        new iam.ManagedPolicy(stack, `${appName}CustomPolicy-${policyFile}`, {
          document: iam.PolicyDocument.fromJson(policyDocument),
        }),
      );
    });
    console.log(`Added ${policyFiles.length} custom policies to the task role`);
  }

  new ssm.StringParameter(stack, `${appName}ecsTaskRoleARN`, {
    parameterName: `/application/v1/${appName}/ecsTaskRoleARN`,
    stringValue: taskRole.roleArn,
  });

  return taskRole;
}
