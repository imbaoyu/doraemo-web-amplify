// Resolver for the identifyObject query
export function request(ctx) {
    return {
      method: "POST",
      resourcePath: "/",
      params: {
        body: {
          Image: {
            S3Object: {
              Bucket: ctx.env.S3_BUCKET_NAME,
              Name: ctx.arguments.path,
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
    return JSON.parse(ctx.result.body)
        .Labels
        .filter((item) => item.Confidence > 70)
        .map((item) => item.Name)
        .join(", ")
        .trim();
}