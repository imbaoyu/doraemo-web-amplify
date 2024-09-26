export function request(ctx: { env: { S3_BUCKET_NAME: string }, arguments: { path: string } }) {
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
  
export function response(ctx: { result: { body: string } }) {
    interface DetectedObject {
        Name: string;
        Confidence: number;
    }

    return JSON.parse(ctx.result.body)
        .Labels
        .filter((item: DetectedObject) => item.Confidence > 70)
        .map((item: DetectedObject) => item.Name)
        .join(", ")
        .trim();
}