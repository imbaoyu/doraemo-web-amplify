import type { Handler } from 'aws-lambda';
import { S3Event } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const dynamoDbClient = new DynamoDBClient({ region: 'us-east-1' });
const snsClient = new SNSClient({ region: 'us-east-1' });
const USER_DOCUMENT_TABLE_NAME = process.env.USER_DOCUMENT_TABLE_NAME || 'UserDocument-NONE';
const DOCUMENT_UPLOAD_TOPIC_ARN = process.env.DOCUMENT_UPLOAD_TOPIC_ARN;

export const handler: Handler = async (event: S3Event) => {
    try {
        for (const record of event.Records) {
            const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
            const owner = key.split('/')[1]; // Assuming path format: user-documents/{userId}/filename
            const fileName = key.split('/').pop() || ''; // Get the file name from the path

            if (record.eventName.startsWith('ObjectCreated')) {
                // Create new UserDocument entry using DynamoDB directly
                const putParams = {
                    TableName: USER_DOCUMENT_TABLE_NAME,
                    Item: {
                        id: { S: key }, // Using the path as the id
                        path: { S: key },
                        owner: { S: owner },
                        status: { S: 'uploaded' },
                        createdAt: { S: new Date().toISOString() },
                        updatedAt: { S: new Date().toISOString() }
                    }
                };
                
                await dynamoDbClient.send(new PutItemCommand(putParams));
                console.log(`Created UserDocument entry for file: ${key}`);

                // Send SNS notification for file upload
                if (DOCUMENT_UPLOAD_TOPIC_ARN) {
                    const message = {
                        eventType: 'DOCUMENT_UPLOADED',
                        documentPath: key,
                        documentName: fileName,
                        owner: owner,
                        timestamp: new Date().toISOString()
                    };

                    const publishParams = {
                        TopicArn: DOCUMENT_UPLOAD_TOPIC_ARN,
                        Message: JSON.stringify(message),
                        MessageAttributes: {
                            'eventType': {
                                DataType: 'String',
                                StringValue: 'DOCUMENT_UPLOADED'
                            }
                        }
                    };

                    await snsClient.send(new PublishCommand(publishParams));
                    console.log(`Published upload notification for file: ${key}`);
                } else {
                    console.warn('DOCUMENT_UPLOAD_TOPIC_ARN not configured, skipping notification');
                }
            } else if (record.eventName.startsWith('ObjectRemoved')) {
                // Delete UserDocument entry using DynamoDB directly
                const deleteParams = {
                    TableName: USER_DOCUMENT_TABLE_NAME,
                    Key: {
                        id: { S: key }
                    }
                };
                
                await dynamoDbClient.send(new DeleteItemCommand(deleteParams));
                console.log(`Deleted UserDocument entry for file: ${key}`);
            }
        }
    } catch (error) {
        console.error("Error handling storage change:", error);
        throw new Error("Failed to process storage change");
    }
}; 