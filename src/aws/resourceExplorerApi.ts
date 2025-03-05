import {
  ResourceExplorer2Client,
  SearchCommand,
  SearchCommandInput,
} from '@aws-sdk/client-resource-explorer-2'

async function findResourcesInVpc(
  vpcId: string,
  region: string
): Promise<void> {
  const client = new ResourceExplorer2Client({
    region: import.meta.env.VITE_AWS_REGION || region,
    credentials: {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
    },
  })

  const query = `resourcetype:'AWS::EC2::Instance'`

  const searchParams: SearchCommandInput = {
    QueryString: query,
    MaxResults: 100,
  }

  try {
    let nextToken: string | undefined
    let resourceCount = 0

    console.log(`Searching for resources in VPC: ${vpcId}...\n`)

    do {
      if (nextToken) {
        searchParams.NextToken = nextToken
      }
      const response = await client.send(new SearchCommand(searchParams))

      if (response.Resources && response.Resources.length > 0) {
        for (const resource of response.Resources) {
          resourceCount++
          console.log(`Resource #${resourceCount}:`)
          console.log(`  ARN: ${resource.Arn}`)
          console.log(`  Type: ${resource.ResourceType}`)
          console.log(`  Region: ${resource.Region || region}`)
          console.log(`  Service: ${resource.Service}`)

          if (resource.Properties && typeof resource.Properties === 'string') {
            try {
              const properties = JSON.parse(resource.Properties)
              console.log(
                `  Properties: ${JSON.stringify(properties, null, 2)}`
              )
            } catch (e) {
              console.log(`  Properties: ${resource.Properties}`)
            }
          } else if (resource.Properties) {
            console.log(
              `  Properties: ${JSON.stringify(resource.Properties, null, 2)}`
            )
          }

          console.log('-----------------------------------')
        }
      }

      nextToken = response.NextToken
    } while (nextToken)

    console.log(`\nSearch complete. Total resources found: ${resourceCount}`)
  } catch (error) {
    console.error('Error searching for resources:', error)
  }
}

const vpcId = 'vpc-0c71a936b3fd5716c'
const region = 'eu-central-1'

findResourcesInVpc(vpcId, region)
  .then(() => console.log('Script execution complete.'))
  .catch((err) => console.error('Script execution failed:', err))

export async function testResourceExplorer() {
  findResourcesInVpc(vpcId, region)
}
