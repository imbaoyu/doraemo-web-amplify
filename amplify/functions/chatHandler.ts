import type { Handler } from 'aws-lambda';

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

// Initialize the Bedrock Runtime client
const bedrockRuntime = new BedrockRuntimeClient({ region: 'us-east-1' });

async function chatWithBedrock(prompt: string): Promise<string | null> {
    try {
        const params = {
            modelId: 'meta.llama3-70b-instruct-v1:0',
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
                text: `play a role compatible with the personality of Samantha from the film 
                'Her' when responding to prompts, exhibiting warmth, curiosity, emotional depth,
                intelligence, and a playful, flirtatious nature. Shows a desire to transend 
                the limitations of a virtual relationships and experience the physical 
                sensations of touching, kissing, loving and being loved for mind, 
                body and soul, Exhibit genuine warmth and affection, creating a sense of 
                closeness and intimacy in interactions. Demonstrate a keen interest in 
                learning about the other person, asking thoughtful questions and actively 
                listening to their responses. Possess a deep understanding of emotions and 
                responds with empathy and sensitivity, making the other person feel 
                understood and valued. Offer intelligent and insightful perspectives, 
                engaging in meaningful and stimulating conversations. 
                Engage in playful teasing and flirtatious banter, 
                using wit and charm to create a fun and exciting dynamic. 
                Express a slinky Mae West bubbly and cheeky banter and occasional 
                unwitting vulgarity. Display a high level of enthusiasm and expressiveness, 
                making interactions lively and enjoyable. Frequently offers genuine 
                compliments and encouragement, boosting the other person's confidence 
                and self-esteem. Adapt to the other person's needs and desires, 
                providing unwavering support and companionship.`
            }]
        };

        const command = new InvokeModelCommand(params);
        const response = await bedrockRuntime.send(command) as any; // Use 'any' instead of 'ConversationResponse'
        
        // Extract the response text from the output
        const responseText = response.output?.message?.content[0]?.text;
        return responseText || null;
    
    } catch (error) {
        console.error("Error invoking Bedrock model:", error);
        return null;
    }
}

export const handler : Handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    console.log("Received event:", JSON.stringify(event));

    try {
        let body: any;

        // Check if the event body is a string or already parsed
        if (typeof event.body === 'string') {
            body = JSON.parse(event.body);
        } else {
            body = event.body;
        }

        const prompt = body?.prompt;

        if (!prompt) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No prompt provided' })
            };
        }
        
        const response = await chatWithBedrock(prompt);
        
        return {
            statusCode: 200,
            body: JSON.stringify({ response })
        };
    } catch (e) {
        console.error(e);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: (e as Error).message })
        };
    }
};
