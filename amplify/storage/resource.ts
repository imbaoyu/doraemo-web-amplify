import { defineStorage } from "@aws-amplify/backend";

export const feedStorage = defineStorage({
  name: "doraemo-web-amplify-feed",
  isDefault: true,
  access: (allow) => ({
    "doraemo-feed-images/*": [allow.authenticated.to(["read", "write", "delete"])],
    "user-documents/*": [allow.authenticated.to(["read", "write", "delete"])]
  }),
});