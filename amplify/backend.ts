import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from "./storage/resource";
import { chatWithBedrock } from './functions/resource';
import { processDocument } from './functions/resource';
import { Stack } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

const backend = defineBackend({
  auth,
  data,
  storage,
  chatWithBedrock,
  processDocument,
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
// TODO use more amplify native method, write to the model
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

const documentFunction = backend.processDocument.resources.lambda as Function;

backend.storage.resources.bucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(documentFunction),
  { prefix: 'user-documents/' }
);

// const userDocumentTable = backend.data.resources.tables.UserDocument.tableName;

documentFunction.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'appsync:GraphQL'
    ],
    resources: [
      `${backend.data.resources.graphqlApi.arn}/types/Mutation/fields/createUserDocument`
    ]
  })
);

// Set API environment variables
documentFunction.addEnvironment('API_URL', backend.data.resources.cfnResources.cfnGraphqlApi.attrGraphQlUrl);
documentFunction.addEnvironment('API_REGION', 'us-east-1');

