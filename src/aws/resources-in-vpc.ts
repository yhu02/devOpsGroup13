import {
  DescribeInstancesCommand,
  DescribeInstancesCommandInput,
  EC2Client,
} from '@aws-sdk/client-ec2'
import { DescribeDBInstancesCommand, RDSClient } from '@aws-sdk/client-rds'
import { invokeDnsLookupLambda } from './invokeLambda'

import { ResourceMetaData } from './resourceMap'

export async function describe_ec2s(vpcId: string, region: string) {
  const resourceMetadata: ResourceMetaData = ResourceMetaData.getInstance()

  const ec2Client = new EC2Client({
    region: import.meta.env.VITE_AWS_REGION || region,
    credentials: {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
    },
  })

  const commandInput: DescribeInstancesCommandInput = {
    Filters: [
      {
        Name: 'vpc-id',
        Values: [vpcId], // Filter instances by VPC ID
      },
    ],
  }

  try {
    // Sending the DescribeInstances request
    const data = await ec2Client.send(
      new DescribeInstancesCommand(commandInput)
    )

    // Extract EC2 Instances from the response and populate the resource map
    data.Reservations?.forEach((reservation) => {
      reservation.Instances?.forEach((instance) => {
        const instanceId = instance.InstanceId
        const privateIp = instance.PrivateIpAddress

        // Retrieve the Name tag from the instance's tags
        const nameTag =
          instance.Tags?.find((tag) => tag.Key === 'Name')?.Value ||
          'No Name Tag'

        // Add the resource to the map using the IP address as the key
        if (privateIp) {
          resourceMetadata.setResource(privateIp, {
            id: instanceId!,
            type: 'EC2',
            name: nameTag,
          })
        }
      })
    })
  } catch (error) {
    console.error('Error describing EC2 instances:', error)
  }

  console.log(resourceMetadata)
}

export async function describe_rdss(vpcId: string, region: string) {
  const resourceMetadata: ResourceMetaData = ResourceMetaData.getInstance()

  const rdsClient = new RDSClient({
    region: import.meta.env.VITE_AWS_REGION || region,
    credentials: {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
    },
  })

  try {
    const data = await rdsClient.send(new DescribeDBInstancesCommand({}))
    const instances = data.DBInstances || []

    // Build an array of async tasks
    const tasks = instances
      .filter(
        (instance) =>
          instance.DBSubnetGroup?.VpcId === vpcId &&
          instance.DBInstanceIdentifier
      )
      .map(async (instance) => {
        const instanceId = instance.DBInstanceIdentifier!
        const endpoint = instance.Endpoint?.Address

        if (endpoint) {
          try {
            const dnsResult = await invokeDnsLookupLambda(endpoint)
            const resolvedIp = JSON.parse(dnsResult.body).address
            if (resolvedIp) {
              resourceMetadata.setResource(resolvedIp, {
                id: instanceId,
                type: 'RDS',
                name: instanceId,
              })
            } else {
              resourceMetadata.setResource(endpoint, {
                id: instanceId,
                type: 'RDS',
                name: instanceId,
              })
            }
          } catch (dnsError) {
            console.error(
              `DNS lookup failed for endpoint ${endpoint}:`,
              dnsError
            )
            resourceMetadata.setResource(endpoint, {
              id: instanceId,
              type: 'RDS',
              name: instanceId,
            })
          }
        } else {
          resourceMetadata.setResource(instanceId, {
            id: instanceId,
            type: 'RDS',
            name: instanceId,
          })
        }
      })

    // Wait for all lookups to complete
    await Promise.all(tasks)
  } catch (error) {
    console.error('Error describing RDS instances:', error)
  }

  console.log(resourceMetadata)
}
