# ChatProcessor Integration Scripts

This directory contains scripts to help with the integration between the Amplify backend and the CDK-deployed ChatProcessor Lambda.

## The Problem

The ChatProcessor Lambda is deployed using CDK and gets a random suffix in its name (e.g., `DoraemoCdkStack-ChatProcessor34D41143-wOCdGd6rR0CK`). This makes it difficult to reference from the Amplify backend, as the name changes with each deployment.

## The Solution

We use AWS Systems Manager (SSM) Parameter Store to store the current name of the ChatProcessor Lambda. The Amplify backend then reads this parameter to get the current name.

## Scripts

### update-chat-processor-name.js

This script updates the SSM parameter with the current name of the ChatProcessor Lambda.

#### Usage

```bash
# Install dependencies
npm install @aws-sdk/client-ssm @aws-sdk/client-lambda

# Run the script
node update-chat-processor-name.js [functionName]
```

If `functionName` is not provided, the script will try to find the function by listing Lambda functions with the prefix "DoraemoCdkStack-ChatProcessor".

#### When to Run

Run this script after deploying the ChatProcessor Lambda to update the SSM parameter with the new function name.

## How It Works

1. The script finds the current name of the ChatProcessor Lambda
2. It updates the SSM parameter `/doraemo/chat-processor-name` with this name
3. The Amplify backend's chatHandler.ts reads this parameter to get the current name
4. The chatHandler uses this name to invoke the ChatProcessor Lambda

## Permissions

The Amplify backend needs permissions to:
1. Read the SSM parameter
2. Invoke the ChatProcessor Lambda

These permissions are configured in the `backend.ts` file.

## Fallback Mechanism

If the SSM parameter cannot be read, the chatHandler falls back to a default name pattern. This is configured in the `chatHandler.ts` file. 