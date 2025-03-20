import { DEFAULT_AWS_REGION } from '../app-types/fargate';
import { BatchFargateStack } from '../deploy-batch-fargate-stack';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export function createEnvironmentVariablesForMainContainer(
  stack: BatchFargateStack,
  environment: string,
  otap: string,
  environmentVariables: string,
  s3ApplicationDataBucket: string,
  stsClientId: string,
) {
  const environmentVariableList: { [key: string]: string } = {};
  const envVariables = environmentVariables || '';
  environmentVariableList['PLATFORM'] = 'FARGATE';
  environmentVariableList['AWS_ACCOUNT_ENV'] = environment;
  environmentVariableList['AWS_REGION'] = DEFAULT_AWS_REGION;
  environmentVariableList['ENVIRONMENT'] = otap;
  environmentVariableList['STS_CLIENT_ID'] = stsClientId;
  environmentVariableList['TMPDIR'] = '/tmp';
  if (s3ApplicationDataBucket) {
    environmentVariableList['APPLICATION_DATA_BUCKET'] = s3ApplicationDataBucket;
  }
  for (const parameterName of envVariables.split(';')) {
    if (parameterName !== '') {
      environmentVariableList[parameterName.slice(parameterName.lastIndexOf('/') + 1)] =
        ssm.StringParameter.valueForStringParameter(stack, parameterName);
    }
  }
  return environmentVariableList;
}
