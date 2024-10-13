import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { feedStorage } from "./storage/resource";
import { Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { chatWithBedrock } from './functions/resource';

const backend = defineBackend({
  auth,
  data,
  feedStorage,
  chatWithBedrock,
});

const dataStack = Stack.of(backend.data)

// Set environment variables for the S3 Bucket name
backend.data.resources.cfnResources.cfnGraphqlApi.environmentVariables = {
  S3_BUCKET_NAME: backend.feedStorage.resources.bucket.bucketName,
};

const rekognitionDataSource = backend.data.addHttpDataSource(
  "RekognitionDataSource",
  `https://rekognition.${dataStack.region}.amazonaws.com`,
  {
    authorizationConfig: {
      signingRegion: dataStack.region,
      signingServiceName: "rekognition",
    },
  }
);

rekognitionDataSource.grantPrincipal.addToPrincipalPolicy(
 new PolicyStatement({
   actions: ["rekognition:DetectText", "rekognition:DetectLabels"],
   resources: ["*"],
 })
);

backend.feedStorage.resources.bucket.grantReadWrite(
  rekognitionDataSource.grantPrincipal
);

// Add Bedrock HTTP data source
// Bedrock endpoints: https://docs.aws.amazon.com/general/latest/gr/bedrock.html
// TODO: remove the bedrock data source once we have the function
const bedrockDataSource = backend.data.addHttpDataSource(
  "BedrockDataSource",
  `https://bedrock-runtime.${dataStack.region}.amazonaws.com`,
  {
    authorizationConfig: {
      signingRegion: dataStack.region,
      signingServiceName: "bedrock",
    },
  }
);

// Grant permissions to invoke Bedrock models
bedrockDataSource.grantPrincipal.addToPrincipalPolicy(
  new PolicyStatement({
    actions: ["bedrock:InvokeModel"],
    resources: ["*"], // You might want to restrict this to specific model ARNs
  })
);

const chatWithBedrockLambda = backend.chatWithBedrock.resources.lambda;

chatWithBedrockLambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'bedrock:InvokeModel',
      'bedrock:InvokeModelWithResponseStream',
      'bedrock:RetrieveAndGenerate',
      'bedrock:InvokeAgent',
      'bedrock:InvokeBuilder',
      'bedrock:InvokeFlow'
    ],
    resources: ['*']
  })
);

