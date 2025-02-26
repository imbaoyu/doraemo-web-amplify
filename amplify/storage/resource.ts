import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "doraemo-web-amplify-storage",
  isDefault: true,
  access: (allow) => ({
    "user-documents/*": [allow.authenticated.to(["get", "write", "delete", "list"])]
  }),
});