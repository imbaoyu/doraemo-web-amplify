import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { feedStorage } from "./storage/resource";
import { Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { chatWithBedrock } from './functions/resource';
import { Function } from 'aws-cdk-lib/aws-lambda'; // Ensure this import is present

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

// Cast chatWithBedrockLambda to the correct type
const chatWithBedrockLambda = backend.chatWithBedrock.resources.lambda as Function;

// Set the environment variable for the Lambda function
chatWithBedrockLambda.addEnvironment('CHAT_HISTORY_TABLE_NAME', 'ChatHistory-jku623bccfdvziracnh673rzwe-NONE');

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

chatWithBedrockLambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:PutItem',
      'dynamodb:GetItem',
      'dynamodb:Query',
      'dynamodb:Scan',
      'dynamodb:UpdateItem',
      'dynamodb:DeleteItem'
    ],
    resources: ['*'] // Replace with your actual table ARN
  })
);
