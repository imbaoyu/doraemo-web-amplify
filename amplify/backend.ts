import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { feedStorage, rekognitionStorage } from "./storage/resource";
import { Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  data,
  feedStorage,
  rekognitionStorage,
});

const dataStack = Stack.of(backend.data)

// Set environment variables for the S3 Bucket name
backend.data.resources.cfnResources.cfnGraphqlApi.environmentVariables = {
 REKOG_S3_BUCKET_NAME: backend.rekognitionStorage.resources.bucket.bucketName,
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
   actions: ["rekognition:DetectObjects"],
   resources: ["*"],
 })
);

backend.feedStorage.resources.bucket.grantReadWrite(
  rekognitionDataSource.grantPrincipal
 );

backend.rekognitionStorage.resources.bucket.grantReadWrite(
 rekognitionDataSource.grantPrincipal
);
