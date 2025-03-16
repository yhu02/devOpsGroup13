import { CloudWatchLogsClientConfig } from '@aws-sdk/client-cloudwatch-logs';
import { config } from 'dotenv';
config();
export const awsConfig: CloudWatchLogsClientConfig = {
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN!,
  },
};
