import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from "./storage/resource";
import { chatWithBedrock, processDocument } from './functions/resource';
import { Stack } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Topic } from 'aws-cdk-lib/aws-sns';

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

// Add Lambda invoke permissions for the chat function - using the fixed name
chatFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ['lambda:InvokeFunction'],
    resources: ['arn:aws:lambda:us-east-1:*:function:DoraemoCdkStack-ChatProcessor']
  })
);

const documentFunction = backend.processDocument.resources.lambda as Function;

const documentStack = Stack.of(backend.processDocument.resources.lambda);

const documentUploadTopic = new Topic(documentStack, 'DocumentUploadTopic', {
    displayName: 'Document Upload Notifications'
});

backend.storage.resources.bucket.addEventNotification(
  EventType.OBJECT_CREATED,
  new LambdaDestination(documentFunction),
  { prefix: 'user-documents/' }
);

backend.storage.resources.bucket.addEventNotification(
  EventType.OBJECT_REMOVED,
  new LambdaDestination(documentFunction),
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

// Add SNS publish permissions for the document function
documentFunction.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'sns:Publish'
    ],
    resources: [documentUploadTopic.topicArn]
  })
);

documentFunction.addEnvironment(
    'USER_DOCUMENT_TABLE_NAME',
    'UserDocument-jku623bccfdvziracnh673rzwe-NONE'
);

documentFunction.addEnvironment(
    'DOCUMENT_UPLOAD_TOPIC_ARN',
    documentUploadTopic.topicArn
);




