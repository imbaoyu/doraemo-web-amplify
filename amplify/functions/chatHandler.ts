import { Handler } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

// Configure Lambda client with increased timeouts
const lambdaClient = new LambdaClient({ 
    region: 'us-east-1',
    requestHandler: {
        // Increase socket timeout to 60 seconds (default is 30s)
        socketTimeout: 60000
    }
});

const CHAT_PROCESSOR_ARN = 'arn:aws:lambda:us-east-1:847373240038:function:DoraemoCdkStack-ChatProcessor';

// chat orchestrator, sends commands to backend services
export const handler: Handler = async (event) => {
    console.log('ChatHandler received event:', JSON.stringify(event));
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

        // Invoke the CDK chat processor Lambda with increased timeout
        console.log('Invoking chat processor Lambda...');
        const response = await lambdaClient.send(new InvokeCommand({
            FunctionName: CHAT_PROCESSOR_ARN,
            Payload: JSON.stringify(formattedEvent),
            InvocationType: 'RequestResponse'
        }));

        // Parse and return the response
        if (response.Payload) {
            console.log('Received response from chat processor');
            const responsePayload = Buffer.from(response.Payload).toString();
            const parsedResponse = JSON.parse(responsePayload);
            console.log('Response payload:', responsePayload);
            
            // Check if the response is an object with a body property (common Lambda response format)
            if (parsedResponse.body) {
                // If body is a string that looks like JSON, parse it
                if (typeof parsedResponse.body === 'string' && 
                    (parsedResponse.body.startsWith('{') || parsedResponse.body.startsWith('['))) {
                    try {
                        const bodyObject = JSON.parse(parsedResponse.body);
                        console.log('Parsed body object:', bodyObject);
                        
                        // If the body object has a text or response property, return that
                        if (bodyObject.text) {
                            return bodyObject.text;
                        } else if (bodyObject.response) {
                            return bodyObject.response;
                        } else {
                            // Otherwise return the whole body object
                            return bodyObject;
                        }
                    } catch (e) {
                        // If parsing fails, return the body string
                        console.log('Failed to parse body as JSON, returning as is');
                        return parsedResponse.body;
                    }
                } else {
                    // If body is not JSON-like, return it directly
                    return parsedResponse.body;
                }
            } else if (parsedResponse.text) {
                // If the response has a text property, return that
                return parsedResponse.text;
            } else if (parsedResponse.response) {
                // If the response has a response property, return that
                return parsedResponse.response;
            }
            
            console.log('Response size:', responsePayload.length, 'bytes');
            return parsedResponse;
        }

        console.error('No response payload received');
        throw new Error('No response payload received');
    } catch (error) {
        console.error('Error invoking chat processor:', error);
        throw error;
    }
};
