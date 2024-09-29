export function request(ctx) {
  console.log('Request args:', ctx.arguments);
  return {
    method: "POST",
    resourcePath: "/",
    params: {
      body: {
        Image: {
          S3Object: {
            Bucket: ctx.env.S3_BUCKET_NAME,
            Name: ctx.arguments.message,
          },
        },
      },
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "RekognitionService.DetectLabels",
      },
    },
  };
}

export function response(ctx) {
  console.log('Response result:', ctx.result);
  return `Echo: ${ctx.arguments.message}`;
}
