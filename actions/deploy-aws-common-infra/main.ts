import * as cdk from "aws-cdk-lib";
import { SetupCommonInfraStack } from "./lib/setup-common-infra-stack";
import { CdkGraph } from "@aws/pdk/cdk-graph";
import { CdkGraphDiagramPlugin } from "@aws/pdk/cdk-graph-plugin-diagram";

(async () => {
  const app = new cdk.App();

  new SetupCommonInfraStack(app, "aa-common-infra-stack", {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  });
  const graph = new CdkGraph(app, {
    plugins: [new CdkGraphDiagramPlugin()],
  });

  app.synth();

  // async cdk-graph reporting hook
  await graph.report();
})();
