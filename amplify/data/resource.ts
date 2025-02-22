import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { chatWithBedrock } from "../functions/resource";

const schema = a.schema({
    ChatHistory: a.model({
        userName: a.string().required(),
        idx: a.integer().default(1).required(),
        prompt: a.string().default(""),
        response: a.string().default(""),
        thread: a.string().required(),
    })
    .identifier(["userName", "idx"])
    .secondaryIndexes((index) => [index("thread").sortKeys(["idx"])])
    .authorization((allow) => [allow.owner()]),

    UserDocument: a.model({
        path: a.string().required(),
        status: a.string().required(),
    })
    .authorization((allow) => [
        allow.owner().to(['read', 'update']),
    ]),

    SendConverseCommand: a.query()
        .arguments({
            prompt: a.string().required(),
        })
        .returns(a.string())
        .authorization((allow) => [allow.authenticated()])
        .handler(
            a.handler.function(chatWithBedrock)
        )
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
    schema,
    authorizationModes: {
        defaultAuthorizationMode: "userPool",
        apiKeyAuthorizationMode: {
            expiresInDays: 30,
        },
    },
});
