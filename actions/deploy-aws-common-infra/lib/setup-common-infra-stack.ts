import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class SetupCommonInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'VPC', { vpcId: ssm.StringParameter.valueFromLookup(this, '/platform/v1/vpc/id') });

    const alb = new elbv2.ApplicationLoadBalancer(this, 'CommonALB', {
      vpc: vpc,
      deletionProtection: true,
      internetFacing: true,
      loadBalancerName: 'CommonALB',
    });

    const applicationListener = alb.addListener('CommonALBListener', {
      port: 443,
      defaultAction: elbv2.ListenerAction.fixedResponse(503, { contentType: 'text/plain' }),
      open: true,
    });

    new ssm.StringParameter(this, 'ALBParameter', {
      description: 'The ARN of the common loadbalancer',
      parameterName: '/application/v1/common/ApplicationLoadBalancerARN',
      stringValue: alb.loadBalancerArn,
    });

    new ssm.StringParameter(this, 'ALBListenerParameter', {
      description: 'The ARN of the common loadbalancer listener (port 443)',
      parameterName: '/application/v1/common/ApplicationLoadBalancerListenerARN',
      stringValue: applicationListener.listenerArn,
    });

    new ssm.StringParameter(this, 'ALBListenerRuleLastPrio', {
      description: 'The priority of the last listener rule',
      parameterName: '/application/v1/common/ApplicationLoadBalancerListenerRuleLastPrio',
      stringValue: '0',
    });

    new cdk.CfnOutput(this, 'ApplicationLoadBalancerARN', { value: alb.loadBalancerArn });
    new cdk.CfnOutput(this, 'ApplicationLoadBalancerListenerARN', { value: applicationListener.listenerArn });
  }
}
