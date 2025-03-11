import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { join } from 'path';
import { readdirSync, readFileSync, existsSync } from 'fs';

import { BatchFargateStack } from '../deploy-batch-fargate-stack';

export function createTaskRole(stack: BatchFargateStack): iam.IRole {
  const appName = stack.appName;
  let taskRole: iam.IRole;
  // Store in SSM

  taskRole = new iam.Role(stack, `${appName}TaskRole`, {
    assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
  });

  taskRole.addManagedPolicy(
    new iam.ManagedPolicy(stack, `${appName}S3Policy`, {
      document: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: [
              's3:GetObject',
              's3:ListBucket',
              's3:ListBucketMultipartUploads',
              's3:ListMultipartUploadParts',
              's3:PutObject',
              's3:DeleteObject',
            ],
            resources: [
              `arn:aws:s3:::${appName}*`, // Bucket ARN
              `arn:aws:s3:::${appName}*/**`, // Object ARNs
            ],
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
