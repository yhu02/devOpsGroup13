import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface EcrProps {
  /**
   * The name of the repository.
   */
  readonly repositoryName: string;

  /**
   * The description of the lifecycle policy.
   * @default 'Remove old images'
   */
  readonly lifecyclePolicyDescription?: string;

  /**
   * The maximum age of the image in days before it is deleted.
   * @default 0
   */
  readonly lifecyclePolicyMaxImageAge?: number;

  /**
   * The maximum number of images to keep in the repository.
   * @default 3
   */
  readonly lifecyclePolicyMaxImageCount?: number;

  /**
   * The permissions policy for the repository.
   * @default '{}'
   */
  readonly permissionsPolicyJson?: string;

  /**
   * Tells whether the tags for the repository should be mutable or immutable.
   * @default true
   */
  readonly immutableTags?: boolean;
}

export class Ecr extends Construct {
  /**
   * The ARN of the repository.
   */
  public readonly repositoryArn: string;

  constructor(scope: Construct, id: string, props: EcrProps) {
    super(scope, id);

    const repositoryName = props.repositoryName;
    const maxImageAge = props.lifecyclePolicyMaxImageAge ?? 0;
    const maxImageCount = props.lifecyclePolicyMaxImageCount ?? 3;
    const lifecyclePolicyDescription = props.lifecyclePolicyDescription ?? 'Remove old images';
    const permissionsPolicyJson = props.permissionsPolicyJson ?? '{}';
    const immutableTags = (props.immutableTags ?? true) ? ecr.TagMutability.IMMUTABLE : ecr.TagMutability.MUTABLE;

    /**
     * Create the ECR repository.
     */
    const repository = new ecr.Repository(this, 'ecrRepo', {
      repositoryName: repositoryName,
      imageScanOnPush: true,
      imageTagMutability: immutableTags,
    });

    /**
     * Add the lifecycle policy to the repository.
     * If the maxImageAge is set, add the policy with maxImageAge.
     * Else, add the policy with maxImageCount.
     */
    if (maxImageAge == 0) {
      repository.addLifecycleRule({
        description: lifecyclePolicyDescription,
        maxImageCount: maxImageCount,
      });
    } else {
      repository.addLifecycleRule({
        description: lifecyclePolicyDescription,
        maxImageAge: cdk.Duration.days(maxImageAge),
      });
    }

    /**
     * Add the permissions policy to the repository.
     * If the permissions policy is set, add the policy statement.
     */
    if (permissionsPolicyJson !== '{}') {
      const permissionsPolicy = iam.PolicyStatement.fromJson(JSON.parse(permissionsPolicyJson!));
      repository.addToResourcePolicy(permissionsPolicy);
    }

    this.repositoryArn = repository.repositoryArn;
  }
}
