import { SetupDeployEcrApp } from './deployEcr'

new SetupDeployEcrApp({
  context: {
    stackName: 'ecr-stack',
    repositoryName: 'ecr-repository',
    lifecyclePolicyDescription: 'Test policy',
    lifecyclePolicyMaxImageAge: 0,
    lifecyclePolicyMaxImageCount: 3,
    permissionsPolicyJson: `{
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
  }`,
    immutableTags: true,
  },
})
