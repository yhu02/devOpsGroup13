import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { BatchFargateStack } from '../deploy-batch-fargate-stack';

/**
   *  Creates EFS Accesspoint that can be used by the containers in this stack and the setup-batch-jobdefinition stack
      NOTE: THIS IS A TEMPORARY SOLUTION UNTIL WE CAN CREATE EFS ACCESS POINTS IN THE SETUP-BATCH-JOBDEFINITION STACK
      TECH DEBT ALERT!
   * @param useEFS 
   * @param otap 
   * @returns 
   */
export function createEcsVolumeIfUsingEFS(stack: BatchFargateStack, useEFS: boolean, otap: string) {
  if (!useEFS) {
    return new Array<ecs.Volume>();
  }

  const appName = stack.appName;
  const appType = stack.appType;
  const ecsVolumes: Array<ecs.Volume> = [];
  const fileSystemId = ssm.StringParameter.valueFromLookup(stack, `/application/v1/${appName}/efsFileSystemId`);

  const applicationAccessPoint = new efs.CfnAccessPoint(stack, `${appName}EfsAccessPoint`, {
    fileSystemId,
    accessPointTags: [
      { key: 'Type', value: 'Application' },
      { key: 'DeployedBy', value: 'gha' },
    ],
    posixUser: {
      gid: '0',
      uid: '0',
    },
    rootDirectory: {
      creationInfo: {
        ownerUid: '0',
        ownerGid: '0',
        permissions: '777',
      },
      path: `/data/static/${otap}/${appName}`,
    },
  });

  // We can remove this after we got rid of the setup-batch-jobdefinition action (and it's CDK stack)
  if (appType != 'task-definition') {
    new ssm.StringParameter(stack, `${appName}efsAccessPointId`, {
      parameterName: `/application/v1/${appName}/efsAccessPointId`,
      stringValue: applicationAccessPoint.attrAccessPointId,
    });
  }

  const ecsVolume = {
    name: 'efs-data',
    efsVolumeConfiguration: {
      fileSystemId: fileSystemId,
      authorizationConfig: {
        accessPointId: applicationAccessPoint.attrAccessPointId,
        iam: 'ENABLED',
      },
      transitEncryption: 'ENABLED',
    },
  } satisfies cdk.aws_ecs.Volume;
  ecsVolumes.push(ecsVolume);
  return ecsVolumes;
}
