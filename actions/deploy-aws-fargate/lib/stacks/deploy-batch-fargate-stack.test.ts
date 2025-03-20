import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { AppContext } from '../types';

import { BatchFargateStack } from './deploy-batch-fargate-stack';
import pythonFastapi from './test-stacks/python-fastapi';
import pythonFastapiWithTask from './test-stacks/python-fastapi-task';
import pythonStreamlit from './test-stacks/python-streamlit';
import rShiny from './test-stacks/r-shiny';
import rShinywWithTask from './test-stacks/r-shiny-task';

// To update the snapshot, run the following command;
/// npm run test -- -u

const stacks: Array<{ appContext: AppContext; name: string }> = [
  { name: 'PythonStreamlit', appContext: pythonStreamlit },
  { name: 'RShiny', appContext: rShiny },
  { name: 'RShinyWithTask', appContext: rShinywWithTask },
  { name: 'PythonFastapi', appContext: pythonFastapi },
  { name: 'PythonFastapiWithTask', appContext: pythonFastapiWithTask },
];

const stacksWithVariants = stacks.flatMap(s => {
  return [
    s,
    {
      name: `${s.name}WithExpose2APIM`,
      appContext: {
        ...s.appContext,
        expose2APIM: 'true',
      },
    },
    {
      name: `${s.name}WithRDS`,
      appContext: {
        ...s.appContext,
      },
    },
    {
      name: `${s.name}UsingMultipleExternalSources`,
      appContext: {
        ...s.appContext,
        useHANA: 'true',
        useBAR: 'true',
        useCDB: 'true',
        useAMB: 'true',
      },
    },
    {
      name: `${s.name}WithoutReuseALB`,
      appContext: {
        ...s.appContext,
        reuseALB: 'false',
      },
    },
    {
      name: `${s.name}WithoutUseEFS`,
      appContext: {
        ...s.appContext,
        useEFS: 'false',
      },
    },
    {
      name: `${s.name}WithApim`,
      appContext: {
        ...s.appContext,
        useAPIM: 'true',
        stsClientId: 'test-sts-client-id',
      },
    },
    {
      name: `${s.name}WithSnowflake`,
      appContext: {
        ...s.appContext,
        useSnowflake: 'true',
        stsClientId: 'test-sts-client-id',
      },
    },
    {
      name: `${s.name}WithSnowflakeAndApim`,
      appContext: {
        ...s.appContext,
        useSnowflake: 'true',
        useAPIM: 'true',
        stsClientId: 'test-sts-client-id',
      },
    },
    {
      name: `${s.name}WithUserDefinedVariables`,
      appContext: {
        ...s.appContext,
        environmentVariables:
          '/application/v1/autobahn-fahrgestell-test-python-fastapi/variables/TEST_PARAM;/application/v1/autobahn-fahrgestell-test-python-fastapi/variables/TEST_PARAM1;/mybackend/anotherpath/MY_EXTRA_PARAM',
      },
    },
  ];
});

describe('Deploy-batch-fargate-stack', () => {
  test.each(stacksWithVariants)('matches the snapshot for $name', ctx => {
    // verbose output for the cdk stack created below :)
    process.env.CDK_DEBUG = 'true';

    // use fake timers, as the snapshot will otherwise fail. This is due to unix timestamps being appended to some cdk constructs
    jest.useFakeTimers().setSystemTime(new Date('2024-03-25'));

    const app = new cdk.App({
      context: ctx.appContext,
    });

    const stack = new BatchFargateStack(app, `${ctx.name}Stack`, {
      env: { account: '123456789012', region: 'eu-central-1' },
      stackName: ctx.name,
    });

    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
});
