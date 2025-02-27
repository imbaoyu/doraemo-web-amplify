# Lambda Integration Guide

This guide explains how to set up a stable integration between the Amplify backend and the CDK-deployed ChatProcessor Lambda.

## The Problem

By default, AWS CDK appends a random suffix to Lambda function names when they are deployed. This makes it difficult to reference the Lambda from other services, as the name changes with each deployment.

## The Solution: Fixed Lambda Name

The simplest solution is to configure the ChatProcessor Lambda with a fixed name in the CDK stack.

## How to Configure a Fixed Lambda Name in CDK

In your CDK stack where the ChatProcessor Lambda is defined, add the `functionName` property:

```typescript
// In your CDK stack (e.g., lib/doraemo-cdk-stack.ts)
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class DoraemoCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the ChatProcessor Lambda with a fixed name
    const chatProcessor = new lambda.Function(this, 'ChatProcessor', {
      functionName: 'DoraemoCdkStack-ChatProcessor', // Fixed name without random suffix
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/chat-processor')),
      // other properties...
    });

    // Rest of your stack definition...
  }
}
```

## Benefits

1. **Simplicity**: No need for SSM parameters or update scripts
2. **Reliability**: The ARN will always be the same
3. **Performance**: No extra API calls needed

## Considerations

1. **Updates**: When you update the Lambda, it will replace the existing one with the same name
2. **Deployment**: You can't have two deployments with the same name in the same region/account
3. **Rollbacks**: If a deployment fails, you might need to manually clean up

## Integration with Amplify Backend

The Amplify backend is configured to invoke the ChatProcessor Lambda using its fixed name:

1. In `amplify/functions/chatHandler.ts`, we use the fixed name to invoke the Lambda
2. In `amplify/backend.ts`, we grant permission to invoke the Lambda with the fixed name

## Troubleshooting

If you encounter issues with the Lambda invocation:

1. Verify that the ChatProcessor Lambda is deployed with the correct fixed name
2. Check the IAM permissions to ensure the chatHandler Lambda can invoke the ChatProcessor
3. Check the CloudWatch logs for both Lambdas for error messages 