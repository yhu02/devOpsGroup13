import { CloudWatchLogsClientConfig } from '@aws-sdk/client-cloudwatch-logs';

export const awsConfig: CloudWatchLogsClientConfig = {
  region: import.meta.env.VITE_AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
    sessionToken: import.meta.env.VITE_AWS_SESSION_TOKEN,
  },
};
