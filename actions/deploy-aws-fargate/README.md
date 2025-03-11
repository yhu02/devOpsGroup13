# deploy-aws-batch-fargate

[![InnerSource status](https://innersource.cf.alliander.com/api/badge/@Alliander/deploy-aws-batch-fargate)](https://innersource.cf.alliander.com)

Create a stack for AWS Batch jobs and Fargate containers

## Install required packages to run CDK for this app

1. First install the following global npm packages:
```bash
npm i -g aws-cdk @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint jest ts-node typescript
```
2. Follow steps 1 to 4 as described in these [docs to get access to the NPM library of Alliander](https://alliander.atlassian.net/wiki/spaces/CLOUD/pages/2512454472/Alliander+NPM+packages+gebruiken)
   1. In this cdk app we depend on the [cloud-cdk-libs of Alliander](https://github.com/Alliander/cloud-cdk-libs).

3. Next, run `npm ci` in the folder of this application where the `[package.json]` is located to install the project's npm dependencies.

## Install required VS Code plugins

To enable the formatting and linting capabilities in your VS Code IDE for TypeScript, I'd recommend to install the following plugins:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

Configure the following setting (settings.json):

```json
  "eslint.format.enable": true,
  "eslint.run": "onSave",
  "eslint.validate": [
    "javascript",
    "typescript"
  ],
  "eslint.workingDirectories": [
    {
      "mode": "auto"
    }
  ],

  "[typescript]": {
    "editor.defaultFormatter": "dbaeumer.vscode-eslint",
    "files.insertFinalNewline": true
  },
```

## Synthesize template locally using CDK synth

To synthesize the template for local troubleshooting, do the following steps:

1. Use AWS SSO to setup the aws profile in your cli.
2. Export APP_NAME in your terminal session: `export APP_NAME=aa-gha-wf-template-python-job`
3. Run CDK Synth: `cdk synth --context appName=aa-gha-wf-template-python-job`

**Disclaimer**: in the [`main.ts`](main.ts), we've setup some default context variables to simulate certain types of jobs and settings. These can be overridden in the cli by adding an additional `--context` argument to your CDK Synth command (as displayed in step 3).

## Inputs
Inputs with a default value are not required to be passed in the function call. If they are not passed, the default value will be used
- `app-name` __required__ - The normalized name of your app containing only [A-Za-z][A-Za-z0-9-]
- `app-type` - Can be `job`, `job-definition`, `shiny`, `shiny-task`, `streamlit`, `streamlit-task`, `fastapi` or `fastapi-task`
- `account-id` __required__ - The AWS account id to deploy the stack to
- `region` - default: `eu-central-1` - The AWS region for the stack
- `image-version` __required__ - The version tag of the image
- `ecs-container-insights` - default: `false` - Whether you want to use CloudWatch alarms.
- `use-spot` - default: `true` - Whether to use Spot Instances
- `ecs-circuit-breaker-rollback` - default: `true` - Whether to enable rollback on deployment failure
- `otap` - The environment in which the app will run. Can be `O`, `T`, `A`, or `P`
- `use-efs` - default: `false` - Does your application use an EFS share for in/output files? Can be `true`, or `false`
- `use-hana` - default: `false` - Does your application use HANA as datasource? Can be `true`, or `false`
- `use-bar` - default: `false` - Does your application use BAR as datasource? Can be `true`, or `false`
- `use-cdb` - default: `false` - Does your application use CDB as datasource? Can be `true`, or `false`
- `use-amb` - default: `false` - Does your application use Apex as datasource? Can be `true`, or `false`
- `expose-to-apim` - default: `false` - Should your application be accessible by API management? Can be `true`, or `false`
- `apim-host` - default: `api.alliander.com` - The APIM endpoint
- `extra-ssm-env-path` - default `""`. The path to the extra SSM parameters to inject as environment variables in the container
- `cdk-rollback-on-failure` - default: `true` - Rollback the CDK deployed stack in case of a failure. Can be `true`, or `false`
- `container-port` - default: `8080` - The (custom) container port
- `min-containers` - default: `1` - The minimum number of containers
- `max-containers` - default: `1` - The maximum number of containers
- `load-balancer-port` - default: `443` - The (custom) loadbalancer port
- `auto-scaling-target-value` - default: `50` - The CPU% to autoscale at
- `reuse-alb` - default: `true` - Reuse a common ALB & Listener for multiple deployments. Can be `true`, or `false`. Expert mode, only change for non-standard infrastructure.
- `ec2-alb-listener-rule-prio` - default: `1` - The ALB Listener Rule prio to use. Expert mode, only change for non-standard infrastructure.
- `target-group-health-check-path` - default: `Auto` - A string array representing the command that the container runs to determine if it is healthy. Do not forget to adjust the portnumber in the command. Expert mode, only change for non-standard infrastructure.
- `target-group-health-check-interval` - default: `30` - The time period in seconds between each health check execution. You may specify between 5 and 300 seconds. The default value is 30 seconds. Health check interval must be bigger than the timeout. Expert mode, only change for non-standard infrastructure.
- `target-group-health-check-timeout` - default: `5` - The time period in seconds to wait for a health check to succeed before it is considered a failure. You may specify between 2 and 60 seconds. The default value is 5. Health check timeout must be smaller than the interval. Expert mode, only change for non-standard infrastructure.
- `ecs-health-check-grace-period` - default `0`. The optional grace period to provide containers time to bootstrap before failed health checks count towards the maximum number of retries by the load balancer. You can specify between 0 and 300 seconds. By default, the startPeriod is off (0). Expert mode, only change for non-standard infrastructure.
- `container-health-check-cmd` - default `[ "CMD-SHELL", "curl -f http://localhost:8080/ || exit 1" ]`, or `["CMD-SHELL", "curl -f http://localhost/${{ target-group-health-check-path }} || exit 1"]` if target-group-health-check-path is set. The command to check if the container state is healthy. Expert mode, only change for non-standard infrastructure.
- `container-health-check-interval` - default `30`. The time period in seconds between each health check execution. You may specify between 5 and 300 seconds. The default value is 30 seconds. Health check interval must be bigger than the timeout. Expert mode, only change for non-standard infrastructure.
- `container-health-check-timeout` - default `5`. The time period in seconds to wait for a health check to succeed before it is considered a failure. You may specify between 2 and 60 seconds. The default value is 5. Health check timeout must be smaller than the interval. Expert mode, only change for non-standard infrastructure.
- `container-health-check-retries` - default `3`. The number of times to retry a failed health check before the container is considered unhealthy. You may specify between 1 and 10 retries. The default value is 3. Expert mode, only change for non-standard infrastructure.
- `container-health-check-start-period` - default `0`. The optional grace period to provide containers time to bootstrap before failed health checks count towards the maximum number of retries. You can specify between 0 and 300 seconds. By default, the startPeriod is off (0). Expert mode, only change for non-standard infrastructure.
- `cpu` - __required__ - The (custom) number of (v)CPUs for your container
- `memory` - __required__ - The (custom) amount of memory for your container
- `main-entrypoint` - default: `run_application -m default` - The command to put in the Fargate Taskdefinition
- `task-entrypoint` - default: `run_application -m job -j default` - The command to put in the Fargate Scheduled Taskdefinition
- `scriptName` - default: `Auto` - Not the name of a script, but the switch that is used in your `run_application` script to switch between different functionalities. Can be `Auto`, or literally anything else you have chosen
- `environment` - __required__ - The environment in which to launch the container. Can be `tst`, `acc`, or `prd`
- `job-schedule` - default: `''` - The jobschedule for Fargate tasks
- `job-notification-topic` - default: `''` - The topic to send notifications to
- `verbose-output` - Provide more output for debugging purposes
- `rds-security-group-id` - default `''` - The RDS security group id so the ECS Fargate container can access your RDS database.
- `cdk-bootstrap` - default `true` - Whether to bootstrap the CDK environment or not.
- `task-role-arn` - default `''` - The ARN of the ECS taskrole to be used by ECS Fargate (in case of an earlier STS deployment (APIM consuming))
- `sts-client-id` - default `''` - The client-id of the STS service to be injected in the ECS Fargate sidecar container (in case of an earlier STS deployment (APIM consuming)).

## Outputs
- `task-role-arn` - The ARN of the ECS taskrole.

## Summary
A message stating that deployment of the stack to AWS was successful

## Usage
This action can be used by adding the following step to your workflow:

```
- name: 'Deploy AWS infrastructure (fargate or batch)'
  id: deploy-aws-batch-fargate
  uses: Alliander/deploy-aws-batch-fargate@main
  with:
    app-name: my-new-shiny-with-task-app
    app-type: 'shiny-task'
    account-id: 55886622
    image-version: 25
    otap: 'O'
    use-hana: true
    use-bar:  true
    # fargate specific settings
    ec2-alb-listener-rule-prio: ${{ needs.Continuous-Delivery.outputs.ec2-alb-listener-rule-prio }}
    # batch specific settings
    language: 'Python'
    cpu: 0.25
    memory: 16
    environment: 'tst'
```

## Issues
- `app-type` has no default value and is not required. This will probably create an issue downstream
- `otap` is not deprecated in this action
- `otap` is not required and has no default value
- `cpu` - has no default value anymore and looks to be fully dependent on `convert-resource-values` now. Either documentation on this parameter needs to explain what valid values are, or this action is not usable on its own
- `memory` - has no default value anymore and looks to be fully dependent on `convert-resource-values` now. Either documentation on this parameter needs to explain what valid values are, or this action is not usable on its own
