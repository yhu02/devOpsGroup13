import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SetupCommonInfraStack } from '../lib/setup-common-infra-stack';

const app = new App();
const stack = new SetupCommonInfraStack(app, 'CommonInfraTestStack', {
  env: {
    region: 'eu-central-1',
    account: '2383838383',
  },
});
const template = Template.fromStack(stack);

test('Application Load Balancer Created', () => {
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: 'internet-facing',
  });
});

test('SSM Parameters Created', () => {
  template.hasResourceProperties('AWS::SSM::Parameter', {
    Description: 'The ARN of the common loadbalancer',
    Name: '/application/v1/common/ApplicationLoadBalancerARN',
  });
  template.hasResourceProperties('AWS::SSM::Parameter', {
    Description: 'The ARN of the common loadbalancer listener (port 443)',
    Name: '/application/v1/common/ApplicationLoadBalancerListenerARN',
  });
  template.hasResourceProperties('AWS::SSM::Parameter', {
    Description: 'The priority of the last listener rule',
    Name: '/application/v1/common/ApplicationLoadBalancerListenerRuleLastPrio',
  });
});
