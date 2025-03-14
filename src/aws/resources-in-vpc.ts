import { EC2Client, DescribeInstancesCommand, DescribeInstancesCommandInput } from "@aws-sdk/client-ec2";

 const vpcId = 'vpc-0c71a936b3fd5716c'
 const region = 'eu-central-1'

 interface AwsResource {
     id: string;
     type: string;
     name: string;
 }

// Placeholder function to create a new resource map.
// This can be replaced or extended in the future for integration.
function createResourceMap(): Map<string, AwsResource> {
    return new Map<string, AwsResource>();
}

  async function describe_ec2s(
     vpcId: string,
     region: string
  ): Promise<Map<string, AwsResource>> {
    // Use the placeholder function to get a new map.
    const resourceMap = createResourceMap();

    const ec2Client = new EC2Client({
        region: import.meta.env.VITE_AWS_REGION || region,
        credentials: {
            accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
            secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
        },
    });

    const commandInput: DescribeInstancesCommandInput = {
        Filters: [{
            Name: "vpc-id",
            Values: [vpcId],  // Filter instances by VPC ID
        }],
    };

    try {
        // Sending the DescribeInstances request
        const data = await ec2Client.send(new DescribeInstancesCommand(commandInput));

         // Extract EC2 Instances from the response and populate the resource map
        data.Reservations?.forEach(reservation => {
            reservation.Instances?.forEach(instance => {
                const instanceId = instance.InstanceId;
                const privateIp = instance.PrivateIpAddress;

                // Retrieve the Name tag from the instance's tags
                const nameTag = instance.Tags?.find(tag => tag.Key === "Name")?.Value || "No Name Tag";

                // Add the resource to the map using the IP address as the key
                if (privateIp) {
                    resourceMap.set(privateIp, { id: instanceId!, type: 'EC2', name: nameTag });
                }
            });
        });
    } catch (error) {
        console.error("Error describing EC2 instances:", error);
    }

    return resourceMap;
 }

export async function testDescribeEc2s() {
    return describe_ec2s(vpcId, region)
}