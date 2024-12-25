import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from "./storage/resource";
import { chatWithBedrock } from './functions/resource';
import { Stack } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  data,
  storage,
  chatWithBedrock,
});

const dataStack = Stack.of(backend.data)

// Set environment variables for the S3 Bucket name
// This is accessed by GraphQL resolvers (like identifyObject)
backend.data.resources.cfnResources.cfnGraphqlApi.environmentVariables = {
  S3_BUCKET_NAME: backend.storage.resources.bucket.bucketName,
};

/*
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


backend.storage.resources.bucket.grantReadWrite(
  rekognitionDataSource.grantPrincipal
);
*/

// Cast chatWithBedrockLambda to the correct type
const chatFunction = backend.chatWithBedrock.resources.lambda as Function;

// Set the environment variable for the Lambda function
chatFunction.addEnvironment(
    'CHAT_HISTORY_TABLE_NAME',
    'ChatHistory-jku623bccfdvziracnh673rzwe-NONE'
);

chatFunction.addToRolePolicy(
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

chatFunction.addToRolePolicy(
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
