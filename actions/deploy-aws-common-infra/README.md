# deploy-aws-common-infra

[![InnerSource status](https://innersource.cf.alliander.com/api/badge/@Alliander/deploy-aws-common-infra)](https://innersource.cf.alliander.com)

Create AWS resources that are necessary for all `appTypes` in Autobahn

## Install required packages to run CDK for this app

1. First install the following global npm packages:
```bash
npm i -g aws-cdk @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint jest ts-node typescript
```

2. Next, run `npm ci` in the folder of this application (e.g. `Autobahn/actions/common/setup-common-infra`) where the `[package.json]` is located to install the project's npm dependencies.

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
2. Run CDK Synth: `cdk synth`

## Inputs
Inputs with a default value are not required to be passed in the function call. If they are not passed, the default value will be used
- `app-name` - __required__ - The normalized name of your app containing only [A-Za-z][A-Za-z0-9-]
- `app-type` - Can be `shiny`, `job`, `job-definition`, `shiny-task`, `streamlit`, `streamlit-task`, `fastapi`, `fastapi-task`, or `library`
- `package-name` - default: `${{ github.event.repository.name }}` - The name of the package in the packagemanager
- `otap` - default: `O` - The environment in which the app will run. Can be `O`, `T`, `A`, or `P`
- `account-id` __required__ - The AWS account id to deploy the resources to
- `region` - default: `eu-central-1` - The AWS region for the resources
- `reuse-alb` - default: `true` - Do you want to reuse a common ALB for multiple deployments. Reusing the load balancer helps with handling limited IP addresses
- `repository` - default: `Auto` - A common image repository to write to, if not provided it will be `appName`
- `use-efs` - default: `false` - Does your application use an EFS share for in/output files? Can be `true`, or `false`
- `efs-file-system-name` - __required__ - The file share for in/output of data files

## Outputs
- `efs-file-system-id` - The EFS id
- `ec2-alb-listener-rule-prio` - The priority of the ALB listener rule

## Summary
This action shows no summary messages

## Usage
This action can be used by adding the following step to your workflow:

```
- name: 'Deploy common AWS infrastructure'
  if: ${{ inputs.appType != 'library' }}
  uses: alliander/deploy-aws-common-infra@main
  id: deploy-aws-common-infra
  with:
    appName: my-new-streamlit-app
    appType: 'streamlit'
    pythonVersion: 'latest'
    accountId: 12345678
    useEFS: true
    efsFileSystemName: data-share
```

## Issues
- `otap` is not deprecated in this action
