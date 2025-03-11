import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { isFargateAppType, isFargateTaskType, isValidAppType } from '../utils';

import { createFargateStack } from './app-types/fargate';

export class BatchFargateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    if (!isValidAppType(this.appType)) {
      throw new Error(`Unrecognized appType: ${this.appType}`);
    }

    if (isFargateAppType(this.appType)) {
      let baseImagesAccountId = this.getStringFromContext('baseImagesAccountId')
      let scheduledTask = false;
      let useNginxProxy = false;
      let NginxProxyImage = '';

      // if apptype contains "task" it will be handled by the task-definition.ts file
      if (isFargateTaskType(this.appType)) {
        scheduledTask = true;
      }

      // useNginxProxy when shiny
      if (this.appType === 'shiny' || this.appType === 'shiny-task') {
        useNginxProxy = true;
        NginxProxyImage = `${baseImagesAccountId}.dkr.ecr.eu-central-1.amazonaws.com/autobahn/proxy-r-shiny-alpine-latest:latest`;
      }

      if (this.appType === 'streamlit' || this.appType === 'streamlit-task') {
        useNginxProxy = true;
        NginxProxyImage = `${baseImagesAccountId}.dkr.ecr.eu-central-1.amazonaws.com/autobahn/proxy-python-streamlit-alpine-latest:latest`;
      }

      createFargateStack(this, {
        expose2APIM: this.getBooleanFromContext('expose2APIM'),
        reuseALB: this.getBooleanFromContext('reuseALB'),
        useEFS: this.getBooleanFromContext('useEFS'),
        otap: this.getStringFromContext('otap'),
        environmentVariables: this.getStringFromContext('environmentVariables'),
        ecsEphemeralStorage: this.getIntFromContext('ecsEphemeralStorage'),
        cpu: this.getIntFromContext('cpu'),
        memory: this.getIntFromContext('memory'),
        containerPort: this.getIntFromContext('containerPort'),
        version: this.getStringFromContext('version'),
        environment: this.getStringFromContext('environment'),
        verboseOutput: this.getStringFromContext('verboseOutput'),
        ecsContainerInsights: this.getBooleanFromContext('ecsContainerInsights'),
        ecsCircuitBreakerRollback: this.getBooleanFromContext('ecsCircuitBreakerRollback'),
        targetGroupHealthCheckPath: this.getStringFromContext('targetGroupHealthCheckPath'),
        targetGroupHealthCheckInterval: this.getIntFromContext('targetGroupHealthCheckInterval'),
        targetGroupHealthCheckTimeout: this.getIntFromContext('targetGroupHealthCheckTimeout'),
        useNginxProxy: useNginxProxy,
        NginxProxyImage: NginxProxyImage,
        scheduledTask: scheduledTask,
        jobSchedule: this.getStringFromContext('jobSchedule'),
        mainEntrypoint: this.getStringFromContext('mainEntrypoint'),
        taskEntrypoint: this.getStringFromContext('taskEntrypoint'),
        jobNotificationTopic: this.getStringFromContext('jobNotificationTopic'),
        containerHealthCheckInterval: this.getIntFromContext('containerHealthCheckInterval'),
        containerHealthCheckTimeout: this.getIntFromContext('containerHealthCheckTimeout'),
        containerHealthCheckRetries: this.getIntFromContext('containerHealthCheckRetries'),
        containerHealthCheckStartPeriod: this.getIntFromContext('containerHealthCheckStartPeriod'),
        containerHealthCheckCmd: this.getStringFromContext('containerHealthCheckCmd'),
        useBAR: this.getBooleanFromContext('useBAR'),
        useCDB: this.getBooleanFromContext('useCDB'),
        useAMB: this.getBooleanFromContext('useAMB'),
        useHANA: this.getBooleanFromContext('useHANA'),
        useAPIM: this.getBooleanFromContext('useAPIM'),
        apimHost: this.getStringFromContext('apimHost'),
        useSnowflake: this.getBooleanFromContext('useSnowflake'),
        snowflakeHost: this.getStringFromContext('snowflakeHost'),
        useSpot: this.getBooleanFromContext('useSpot'),
        ecsHealthCheckGracePeriod: this.getIntFromContext('ecsHealthCheckGracePeriod'),
        ec2ALBListenerRulePrio: this.getIntFromContext('ec2ALBListenerRulePrio'),
        minContainers: this.getIntFromContext('minContainers'),
        maxContainers: this.getIntFromContext('maxContainers'),
        asgTargetValue: this.getIntFromContext('asgTargetValue'),
        loadBalancerPort: this.getIntFromContext('loadBalancerPort'),
        rdsSecurityGroupId: this.getStringFromContext('rdsSecurityGroupId'),
        rdsDbName: this.getStringFromContext('rdsDbName'),
        taskRoleArn: this.getStringFromContext('taskRoleArn'),
        stsClientId: this.getStringFromContext('stsClientId'),
        s3ApplicationDataBucketArn: this.getStringFromContext('s3ApplicationDataBucketArn'),
        repositoryName: this.getStringFromContext('repositoryName'),
      });
      return;
    }

    throw new Error(
      `AppType ${this.appType} should only be called from it's own file. It is being called from the main file instead`,
    );
  }

  /**
   * Retrieves a context value using the specified key, and parses the value to an integer.
   *
   * @param key - The key used to look up the context value.
   * @returns The integer value associated with the specified key, or NaN if the value cannot be parsed to an integer.
   */
  getIntFromContext(key: string): number {
    return parseInt(this.node.tryGetContext(key));
  }

  /**
   * Retrieves a context value using the specified key, and casts the value to a string.
   *
   * @param key - The key used to look up the context value.
   * @returns The string value associated with the specified key, or undefined if the key doesn't exist.
   */
  getStringFromContext(key: string): string {
    return this.node.tryGetContext(key) as string;
  }

  /**
   * Retrieves a context value using the specified key, and evaluates the value to a boolean.
   * The value is considered true if it is a string that equals "true" (case-insensitive).
   *
   * @param key - The key used to look up the context value.
   * @returns true if the value associated with the specified key is "true" (case-insensitive), otherwise false.
   */
  getBooleanFromContext(key: string): boolean {
    return this.node.tryGetContext(key)?.toLowerCase() === 'true';
  }

  /**
   * Helper function to create an ECS Secret from an SSM parameter.
   *
   * @param datasourceName - Name of the datasource.
   * @param secretType - Type of secret (INSTANCE, USERNAME, or PASSWORD).
   * @returns An ECS Secret created from an SSM secure string parameter.
   */

  /**
   * Helper function to quickly get the app name
   */
  get appName(): string {
    return this.getStringFromContext('appName');
  }

  /**
   * Helper function to quickly get the app type
   */
  get appType(): string {
    return this.getStringFromContext('appType');
  }
}
