import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

export async function invokeLambda(functionName: string, payload: any): Promise<any> {
  const lambdaClient = new LambdaClient({
    region: import.meta.env.VITE_AWS_REGION,
    credentials: {
        accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
        secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
    },
  });
  const command = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: "RequestResponse",
    Payload: new TextEncoder().encode(JSON.stringify(payload)),
  });
  const response = await lambdaClient.send(command);
  if (response.Payload) {
    const responseString = new TextDecoder().decode(response.Payload);
    return JSON.parse(responseString);
  }
  return null;
}

export async function invokeDnsLookupLambda(domain: string): Promise<any> {
  return await invokeLambda("dnsLookupLambda", { domain });
}