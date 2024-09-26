import { defineStorage } from "@aws-amplify/backend";

export const feedStorage = defineStorage({
  name: "doraemo-web-amplify-feed",
  isDefault: true,
  access: (allow) => ({
    "doraemo-feed-images/*": [allow.authenticated.to(["read", "write", "delete"])],
  }),
});

export const rekognitionStorage = defineStorage({
  name: "doraemo-web-amplify-rekognition",
  access: (allow) => ({
    "doraemo-rekognition/*": [allow.authenticated.to(["write", "get", "list"])],
  }),
});