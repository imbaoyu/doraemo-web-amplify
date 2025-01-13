import type { Handler } from 'aws-lambda';
import { S3Event } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoDbClient = new DynamoDBClient({ region: 'us-east-1' });
const USER_DOCUMENT_TABLE_NAME = process.env.USER_DOCUMENT_TABLE_NAME || 'UserDocument-NONE';

export const handler: Handler = async (event: S3Event) => {
    try {
        for (const record of event.Records) {
            const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
            const owner = key.split('/')[1]; // Assuming path format: user-documents/{userId}/filename

            // Create new UserDocument entry using DynamoDB directly
            const putParams = {
                TableName: USER_DOCUMENT_TABLE_NAME,
                Item: {
                    id: { S: key }, // Using the path as the id
                    path: { S: key },
                    owner: owner,
                    status: { S: 'uploaded' },
                    createdAt: { S: new Date().toISOString() },
                    updatedAt: { S: new Date().toISOString() }
                }
            };
            
            await dynamoDbClient.send(new PutItemCommand(putParams));
            console.log(`Created UserDocument entry for file: ${key}`);
        }
    } catch (error) {
        console.error("Error handling storage change:", error);
        throw new Error("Failed to process storage change");
    }
}; 