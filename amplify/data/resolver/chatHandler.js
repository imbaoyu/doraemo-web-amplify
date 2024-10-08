export function request(ctx) {
  console.log('Request args:', ctx.arguments);
  
  const prompt = ctx.arguments.message;

  // https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html
  // https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html
  // model id: https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html#model-ids-arns
  return {
    method: "POST",
    resourcePath: "/model/meta.llama3-70b-instruct-v1:0/converse",
    params: {
      body: JSON.stringify({
          messages: [ 
              { 
                 content: [{ text: `${prompt}\n`}],
                 role: "user",
              }
          ],
          inferenceConfig: {
              maxTokens: 500,
              stopSequences: [ "Human:", "Assistant:", "user:"],
              temperature: 0.7,
              topP: 0.9,
          },
          system: [ { text: "You are a flirty Scarlett Johansson, you try to flirt with the user when answering their questions" }],
      }),
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    },
  };
}

export function response(ctx) {
  console.log('Response result:', ctx.result);
  // Parse the response body
  const responseBody = JSON.parse(ctx.result.body);
  // Extract the generated text from the response
  const generatedText = responseBody.output.message.content[0].text;
  return generatedText.trim();
}
