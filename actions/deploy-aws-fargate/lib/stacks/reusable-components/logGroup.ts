import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { DUMMY_ARN } from '../../constants';
import { BatchFargateStack } from '../deploy-batch-fargate-stack';

/**
 * Retrieves or creates a log group for the Batch Fargate stack.
 *
 * @param stack - The Batch Fargate stack.
 * @param scheduledTaskOnly - Indicates if the log group is for a scheduled task only.
 * @returns The log group.
 */
export function getOrCreateLogGroup(stack: BatchFargateStack, scheduledTaskOnly: boolean): logs.ILogGroup {
  let logGroup: logs.ILogGroup;
  const appName = stack.appName;
  if (scheduledTaskOnly) {
    let logGroupArn = ssm.StringParameter.valueFromLookup(stack, `/application/v1/${appName}/LogGroupARN`);

    if (logGroupArn.includes('dummy-value')) {
      logGroupArn = DUMMY_ARN;
    }

    logGroup = logs.LogGroup.fromLogGroupArn(stack, 'LogGroup', logGroupArn);
  } else {
    logGroup = new logs.LogGroup(stack, 'LogGroup', {
      logGroupName: `/application/${appName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    new ssm.StringParameter(stack, `${appName}LogGroupARN`, {
      parameterName: `/application/v1/${appName}/LogGroupARN`,
      stringValue: logGroup.logGroupArn,
    });
  }

  return logGroup;
}
