import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "doraemo-web-amplify",
  access: (allow) => ({
    "doraemo-feed-images/*": [allow.authenticated.to(["read", "write", "delete"])],
  }),
});