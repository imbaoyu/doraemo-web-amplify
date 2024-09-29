export function request(ctx) {
  console.log('Request args:', ctx.arguments);
  
  const prompt = ctx.arguments.message;

  // https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html
  // model id: https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html#model-ids-arns
  return {
    method: "POST",
    resourcePath: "/model/meta.llama3-2-90b-instruct-v1:0/invoke",
    params: {
      body: JSON.stringify({
        prompt: `Human: ${prompt}\nAssistant:`,
        max_gen_len: 500,
        temperature: 0.7,
        top_p: 0.9,
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
  const generatedText = responseBody.generation;
  
  return generatedText.trim();
}
