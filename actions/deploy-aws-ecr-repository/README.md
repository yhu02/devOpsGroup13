# deploy-aws-ecr-repository

[![InnerSource status](https://innersource.cf.alliander.com/api/badge/@Alliander/deploy-aws-ecr-repository)](https://innersource.cf.alliander.com)

This action creates or updates an ECR repository in the specified AWS account.
This action is build in TypeScript and is using the AWS CDK library, please see:
https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecr.Repository.html

# Prerequisites

In order to deploy in AWS, you'll need to install a deploy role into your account first.
You can do this from within the AWS Service Catalog in the specific AWS account:
https://eu-central-1.console.aws.amazon.com/servicecatalog/home?region=eu-central-1#products/prod-kqcs6kvonyisi

##

## Environment Variables

## `NODE_AUTH_TOKEN`

**Required** use the NPM package repository organisational secret to access Alliander's NPM package repository

## Inputs

## `account-id`

**Required** The ID of the AWS account where you want to deploy the ECR repository.

## `region`

The AWS region where you want to deploy the ECR repository. Default `'eu-central-1'`.

## `stack-name`

**Required** The name of the CloudFormation stack to use. Be careful because if you change this,
it will create a new stack besides the old one!

## `stackset`

The value of the stackset tag applied to the CloudFormation stack. Default: `ecr`.

## `stateful`

Whether the CloudFormation stack should be tagged as stateful. Default: `false`.

## `app-name`

The app-name to use for the SSM parameter path to write the repository to, e.g. `/application/v1/${app-name}/ecrRepository`

## `environment`

The environment to use for the fine-grained access permissions, e.g. `tst`, `acc` or `prd`. Only used when the `fine-grained-pax-permissions` input parameter is set to `true`.

## `repository-name`

**Required** The name of the ECR repository

## `lifecycle-policy-description`

Describes the purpose of the lifecyle policy rule. Default `'Remove old images'`

## `lifecycle-policy-max-image-age`

The maximum age of images to retain. The value must represent a number of days.
Specify exactly one of maxImageCount and maxImageAge. Default `'0'`.

## `lifecycle-policy-max-image-count`

The maximum number of images to retain.
Specify exactly one of maxImageCount and maxImageAge. Default `'3'`.

## `permissions-policy-json`

Creates a new PolicyStatement based on the object provided. Default `'{}'`
Example:

```
'{
  "Sid": "AllowOrgWidePull",
  "Effect": "Allow",
  "Principal": "*",
  "Action": [
    "ecr:BatchCheckLayerAvailability",
    "ecr:BatchGetImage",
    "ecr:GetDownloadUrlForLayer"
  ],
  "Condition": {
    "ForAnyValue:StringLike": {
      "aws:PrincipalOrgPaths": [
        "o-0jz2l2i6oh/r-y4ec/ou-y4ec-32hg0ht3/*",
        "o-0jz2l2i6oh/r-y4ec/ou-y4ec-tau66gtr/*"
      ]
    }
  }
}'
```

## `allow-pull-from-pax`

If set at `true`, the ECR repository will have pull permissions from the PAX clusters. Default: `false`. Set to `true` if you want the PAX-clusters (ArgoCD) to be able to pull images from this ECR repository.

## `fine-grained-pax-permissions`

If set at `true`, the pull permissions will align with the tenants environments, i.e. `pax-tst` -> `tenant-tst`, `pax-acc` -> `tenant-acc` and `pax-prd` -> `tenant-prd`

## `immutable-tags`

If set at `true`, the ECR repository will have tag immutability. Default: `true`. Set to `false` if you want to be able to overwrite images with the same tags.

## `cdk-bootstrap`

If set at `true`, the CDK bootstrap is being performed, i.e. `cdk bootstrap --app "" aws://${{ inputs.account-id }}/${{ inputs.region }}`

## Outputs

## `repository-arn`

The ARN of the created or updated ECR repository. You can use this to export it to the SSM parameter store for example.

## Example usage

```
name: deploy-aws-ecr-repository

on:
  push:
  workflow_dispatch:

jobs:
  deploy-aws-ecr-repository:
    runs-on: [self-hosted, X64, Linux, minimal ]
    environment: tst
    permissions:
      # This is used to complete the identity challenge
      # with sigstore/fulcio when running outside of PRs.
      id-token: write

    steps:
      - name: ECR deploy
        id: deploy-aws-ecr-repository
        uses: Alliander/deploy-aws-ecr-repository@main
        with:
          account-id: '1234567890'
          stack-name: 'testStack'
          repository-name: 'testrepo/testpath'
          lifecycle-policy-max-image-age: '30'  # Remove parameter to use the default (`0`)
          lifecycle-policy-max-image-count: '0' # Remove parameter to use the default (`3`)
          permissions-policy-json: '{
                                    "Sid": "AllowOrgWidePull",
                                    "Effect": "Allow",
                                    "Principal": "*",
                                    "Action": [
                                      "ecr:BatchCheckLayerAvailability",
                                      "ecr:BatchGetImage",
                                      "ecr:GetDownloadUrlForLayer"
                                    ],
                                    "Condition": {
                                      "ForAnyValue:StringLike": {
                                        "aws:PrincipalOrgPaths": [
                                          "o-0jz2l2i6oh/r-y4ec/ou-y4ec-32hg0ht3/*",
                                          "o-0jz2l2i6oh/r-y4ec/ou-y4ec-tau66gtr/*"
                                        ]
                                      }
                                    }
                                  }'

      - name: Fetch output
        shell: bash
        run: |
          echo ${{ steps.deploy-aws-ecr-repository.outputs.repository-arn }}
```

# Developer section

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npm run test --update` update the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template
