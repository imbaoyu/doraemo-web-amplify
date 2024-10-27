import type { Handler, Context } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { v4 as uuidv4 } from 'uuid';

// Define the table name using an environment variable
const CHAT_HISTORY_TABLE_NAME = process.env.CHAT_HISTORY_TABLE_NAME || 'chat-history-table';
const CHAT_HISTORY_GSI_NAME = 'chatHistoriesByThreadAndIdx';
const MODEL_ID = 'meta.llama3-70b-instruct-v1:0'
const REGION = 'us-east-1';
// const CONTEXT_WINDOW_SIZE = 5;

// Initialize the DynamoDB and Bedrock clients
const dynamoDbClient = new DynamoDBClient({ region: REGION });
const bedrockRuntime = new BedrockRuntimeClient({ region: REGION });

async function chatWithBedrock(prompt: string): Promise<string | null> {
    try {
        const aggregatedMessage = [{
            role: "user",
            content: [{ text: `${prompt}\n` }]
        }];

        const params = {
            modelId: MODEL_ID,
            messages: aggregatedMessage as any[],
            inferenceConfig: {
                maxTokens: 500,
                stopSequences: ["Human:", "Assistant:", "user:"],
                temperature: 1,
                topP: 0.8,
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

async function updateChatHistory(userName: string, promptText: string, responseText: string, isNewThread: boolean): Promise<void> {
    try {
        // Get the largest idx value of the user
        const idxParams = {
            TableName: CHAT_HISTORY_TABLE_NAME,
            KeyConditionExpression: 'userName = :userName',
            ExpressionAttributeValues: {
                ':userName': { S: userName },
            },
            ProjectionExpression: 'idx',
            ScanIndexForward: false, // Sort descending to get the largest idx first
            Limit: 1 // Only need the largest idx
        };

        const latestIdxEntries = await dynamoDbClient.send(new QueryCommand(idxParams));
        const newIdx = latestIdxEntries.Items?.length ? parseInt(latestIdxEntries.Items[0].idx.N ?? '0') + 1 : 1;
        const threadId = isNewThread ? uuidv4() : 'oldId';

        // Create new ChatHistory entries
        const putParamsPrompt = {
            TableName: CHAT_HISTORY_TABLE_NAME,
            Item: {
                //id: { S: uuidv4() }, // Add a randomly generated ID
                userName: { S: userName },
                idx: { N: newIdx.toString() },
                prompt: { S: promptText },
                response: { S: responseText },
                thread: { N: threadId.toString() },
            }
        };
        await dynamoDbClient.send(new PutItemCommand(putParamsPrompt));
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
        const userName = event.identity?.username ?? 'anon';
        const promptText = args?.prompt;
        if (!promptText) {
            throw new Error('No prompt provided');
        }

        // Add recent conversation as context

        // Interact with Bedrock
        const responseText = await chatWithBedrock(promptText);
        if (!responseText) {
            throw new Error('Failed to get response');
        }

        // Update ChatHistory
        await updateChatHistory(userName, promptText, responseText, true);

        // Return only the response text
        return text;

    } catch (e) {
        console.error("Error:", e);
        throw new Error((e as Error).message);
    }
};
