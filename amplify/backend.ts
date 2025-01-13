import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from "./storage/resource";
import { chatWithBedrock, processDocument } from './functions/resource';
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

chatFunction.addEnvironment('AMPLIFY_API_ID', '#{AMPLIFY_API_ID}');
chatFunction.addEnvironment('AMPLIFY_ENV', '#{AMPLIFY_ENV}');

const documentFunction = backend.processDocument.resources.lambda as Function;

backend.storage.resources.bucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(documentFunction),
  { prefix: 'user-documents/' }
);

// Add DynamoDB permissions for the document function
documentFunction.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:PutItem',
      'dynamodb:GetItem',
      'dynamodb:Query',
      'dynamodb:UpdateItem',
      'dynamodb:DeleteItem'
    ],
    resources: ['*']
  })
);

documentFunction.addEnvironment(
    'USER_DOCUMENT_TABLE_NAME',
    'UserDocument-jku623bccfdvziracnh673rzwe-NONE'
);

documentFunction.addEnvironment('AMPLIFY_API_ID', '#{AMPLIFY_API_ID}');
documentFunction.addEnvironment('AMPLIFY_ENV', '#{AMPLIFY_ENV}');


