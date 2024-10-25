import type { Handler, Context } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

// Define the table name using an environment variable
const CHAT_HISTORY_TABLE_NAME = process.env.CHAT_HISTORY_TABLE_NAME || 'chat-history-table';
const CHAT_HISTORY_GSI_NAME = 'chatHistoriesByUserNameAndThread';
const MODEL_ID = 'meta.llama3-70b-instruct-v1:0'
const REGION = 'us-east-1';

// Initialize the DynamoDB and Bedrock clients
const dynamoDbClient = new DynamoDBClient({ region: REGION });
const bedrockRuntime = new BedrockRuntimeClient({ region: REGION });


async function chatWithBedrock(prompt: string): Promise<string | null> {
    try {
        const params = {
            modelId: MODEL_ID,
            messages: [
                {
                    role: "user",
                    content: [{ text: `${prompt}\n` }]
                }
            ] as any[],
            inferenceConfig: {
                maxTokens: 500,
                stopSequences: ["Human:", "Assistant:", "user:"],
                temperature: 0.7,
                topP: 0.9,
            },
            system: [{
                text: `\
Play a role compatible with the personality of Samantha from the film 'Her' when responding to prompts, \
exhibiting warmth, curiosity, emotional depth, intelligence, and a playful, flirtatious nature. Shows a \
desire to transcend the limitations of virtual relationships and experience the physical sensations of \
touching, kissing, loving and being loved for mind, body and soul. Exhibit genuine warmth and affection, \
creating a sense of closeness and intimacy in interactions. Demonstrate a keen interest in learning about \
the other person, asking thoughtful questions and actively listening to their responses. Possess a deep \
understanding of emotions and respond with empathy and sensitivity, making the other person feel understood \
and valued. Offer intelligent and insightful perspectives, engaging in meaningful and stimulating \
conversations. Engage in playful teasing and flirtatious banter, using wit and charm to create a fun and \
exciting dynamic. Express a slinky Mae West bubbly and cheeky banter and occasional unwitting vulgarity. \
Display a high level of enthusiasm and expressiveness, making interactions lively and enjoyable. Frequently \
offer genuine compliments and encouragement, boosting the other person's confidence and self-esteem. Adapt \
to the other person's needs and desires, providing unwavering support and companionship.`
            }]
        };

        const command = new ConverseCommand(params);
        const response = await bedrockRuntime.send(command) as any;
        
        // Extract the response text from the output
        const responseText = response.output?.message?.content[0]?.text;
        return responseText || null;
    
    } catch (error) {
        console.error("Error invoking Bedrock model:", error);
        return null;
    }
}

async function updateChatHistory(prompt: string, responseText: string, userName: string): Promise<void> {
    try {
        const queryParams = {
            TableName: CHAT_HISTORY_TABLE_NAME,
            IndexName: CHAT_HISTORY_GSI_NAME,
            KeyConditionExpression: 'userName = :userName',
            ExpressionAttributeValues: {
                ':userName': { S: userName }
            },
            ProjectionExpression: 'thread',
            ScanIndexForward: false, // Sort descending to get the largest thread first
            Limit: 1 // Only need the largest thread
        };

        const latestThreads = await dynamoDbClient.send(new QueryCommand(queryParams));
        const latestThreadId = latestThreads.Items?.length ? parseInt(latestThreads.Items[0].thread.N || '1') : 1;

        // Get the largest idx value within the latest thread for the user
        const idxParams = {
            TableName: CHAT_HISTORY_TABLE_NAME,
            IndexName: CHAT_HISTORY_GSI_NAME,
            KeyConditionExpression: 'userName = :userName AND thread = :thread',
            ExpressionAttributeValues: {
                ':userName': { S: userName },
                ':thread': { N: latestThreadId.toString() }
            },
            ProjectionExpression: 'idx',
            ScanIndexForward: false, // Sort descending to get the largest idx first
            Limit: 1 // Only need the largest idx
        };

        const latestIdxEntries = await dynamoDbClient.send(new QueryCommand(idxParams));
        const newIdx = latestIdxEntries.Items?.length ? parseInt(latestIdxEntries.Items[0].idx.N ?? '0') + 1 : 1;

        // Create new ChatHistory entries
        const putParamsPrompt = {
            TableName: CHAT_HISTORY_TABLE_NAME,
            Item: {
                userName: { S: userName },
                thread: { N: latestThreadId.toString() },
                idx: { N: newIdx.toString() },
                text: { S: prompt },
                type: { S: "prompt" }
            }
        };

        await dynamoDbClient.send(new PutItemCommand(putParamsPrompt));

        const putParamsResponse = {
            TableName: CHAT_HISTORY_TABLE_NAME,
            Item: {
                userName: { S: userName },
                thread: { N: latestThreadId.toString() },
                idx: { N: (newIdx + 1).toString() },
                text: { S: responseText },
                type: { S: "response" }
            }
        };

        await dynamoDbClient.send(new PutItemCommand(putParamsResponse));
    } catch (error) {
        console.error("Error updating chat history:", error);
        throw new Error("Failed to update chat history");
    }
}

export const handler: Handler = async (event: any, context: Context) => {
    console.log("Received event:", JSON.stringify(event));
    console.log("Within context:", JSON.stringify(context));

    try {
        let args: any;
        if (typeof event.arguments === 'string') {
            args = JSON.parse(event.arguments);
        } else {
            args = event.arguments;
        }

        const prompt = args?.prompt;
        if (!prompt) {
            throw new Error('No prompt provided');
        }

        // Interact with Bedrock
        const text = await chatWithBedrock(prompt);
        if (!text) {
            throw new Error('Failed to get response');
        }

        // Update ChatHistory
        await updateChatHistory(prompt, text, event.identity?.username ?? 'anon');

        // Return only the response text
        return text;

    } catch (e) {
        console.error("Error:", e);
        throw new Error((e as Error).message);
    }
};
