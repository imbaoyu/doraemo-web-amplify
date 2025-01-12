import type { Handler } from 'aws-lambda';
import { S3Event } from 'aws-lambda';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../data/resource';

const client = generateClient<Schema>();

export const handler: Handler = async (event: S3Event) => {
    try {
        for (const record of event.Records) {
            const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
            
            // Create new UserDocument entry using the client
            await client.models.UserDocument.create({
                path: key,
                status: 'uploaded'
            });
            
            console.log(`Created UserDocument entry for file: ${key}`);
        }
    } catch (error) {
        console.error("Error handling storage change:", error);
        throw new Error("Failed to process storage change");
    }
}; 