import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "doraemowebamplifystorage",
  access: (allow) => ({
    "user-documents/*": [allow.authenticated.to(["get", "write", "delete", "list"])]
  })
});