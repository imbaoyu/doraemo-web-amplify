import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "doraemo-web-amplify-storage",
  isDefault: true,
  access: (allow) => ({
    "doraemo-feed-images/*": [allow.authenticated.to(["read", "write", "delete"])],
    "user-documents/*": [allow.authenticated.to(["read", "write", "delete"])]
  }),
});