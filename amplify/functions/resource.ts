import { defineFunction } from "@aws-amplify/backend";
import { Function } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export const chatWithBedrock = defineFunction((scope: Construct) => {
    const fn = new Construct(scope, 'chatWithBedrock');
    return Function.fromFunctionArn(
        fn,
        'Resource',
        'arn:aws:lambda:us-east-1:847373240038:function:DoraemoCdkStack-ChatProcessor34D41143-wOCdGd6rR0CK'
    );
});

// See: https://docs.amplify.aws/react/build-a-backend/troubleshooting/circular-dependency/
export const processDocument = defineFunction({
    name: 'processDocument',
    entry: './storageHandler.ts',
    timeoutSeconds: 30
});
 