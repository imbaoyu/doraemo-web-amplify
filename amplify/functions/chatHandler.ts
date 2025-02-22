import { Handler } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({ region: 'us-east-1' });
const CHAT_PROCESSOR_ARN = 'arn:aws:lambda:us-east-1:847373240038:function:DoraemoCdkStack-ChatProcessor34D41143-wOCdGd6rR0CK';

// chat orchestrator, sends commands to backend services
export const handler: Handler = async (event) => {
    try {
        // Extract and format the necessary information
        const formattedEvent = {
            arguments: event.arguments,
            identity: {
                username: event.identity?.username || 'anon',
                claims: {
                    sub: event.identity?.claims?.sub || 'anonId'
                }
            }
        };

        console.log('Formatted event:', JSON.stringify(formattedEvent));

        // Invoke the CDK chat processor Lambda
        const response = await lambdaClient.send(new InvokeCommand({
            FunctionName: CHAT_PROCESSOR_ARN,
            Payload: JSON.stringify(formattedEvent),
            InvocationType: 'RequestResponse'
        }));

        // Parse and return the response
        if (response.Payload) {
            const responsePayload = Buffer.from(response.Payload).toString();
            return JSON.parse(responsePayload);
        }

        throw new Error('No response payload received');
    } catch (error) {
        console.error('Error invoking chat processor:', error);
        throw error;
    }
};
