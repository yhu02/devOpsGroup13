import { SynthUtils } from '@aws-cdk/assert'
import * as cdk from 'aws-cdk-lib'
import { AppProps } from 'aws-cdk-lib'
import * as ssm from 'aws-cdk-lib/aws-ssm'

import { Ecr } from './Ecr'

interface SetupDeployEcrAppProps extends AppProps {
  context: {
    stackName: string
    repositoryName: string
    lifecyclePolicyDescription: string
    lifecyclePolicyMaxImageAge: number
    lifecyclePolicyMaxImageCount: number
    permissionsPolicyJson: string
    immutableTags: boolean
  }
}
export class SetupDeployEcrApp {
  public template: any

  constructor(props: SetupDeployEcrAppProps) {
    ;(async () => {
      const app = new cdk.App({
        context: props.context,
      })

      console.log(
        `this is the stackname: ${app.node.tryGetContext('stackName')}`
      )
      console.log(
        `Permissions Policy: ${app.node.tryGetContext('permissionsPolicyJson')}`
      )

      const stack = new cdk.Stack(app, app.node.tryGetContext('stackName'))

      const ecr = new Ecr(stack, app.node.tryGetContext('stackName'), {
        repositoryName: app.node.tryGetContext('repositoryName'),
        lifecyclePolicyDescription: app.node.tryGetContext(
          'lifecyclePolicyDescription'
        ),
        lifecyclePolicyMaxImageAge: parseInt(
          app.node.tryGetContext('lifecyclePolicyMaxImageAge')
        ),
        lifecyclePolicyMaxImageCount: parseInt(
          app.node.tryGetContext('lifecyclePolicyMaxImageCount')
        ),
        permissionsPolicyJson: app.node.tryGetContext('permissionsPolicyJson'),
        immutableTags: JSON.parse(app.node.tryGetContext('immutableTags')),
      })

      new cdk.CfnOutput(stack, 'RepositoryARN', { value: ecr.repositoryArn })

      app.synth()
      // Store the CloudFormation template in the template member variable
      this.template = SynthUtils.toCloudFormation(stack)
    })()
  }
}
