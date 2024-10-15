import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { chatWithBedrock } from "../functions/resource";

const schema = a.schema({
    Todo: a.model({
        content: a.string(),
        isDone: a.boolean().default(false),
    })
    .authorization((allow) => [allow.owner()]),

    Feed: a.model({
        title: a.string().required(),
        author: a.string().required(),
        content: a.string().required(),
        images: a.string().array(),
    }).authorization((allow) => [allow.owner()]),

    ChatHistory: a.model({
        thread: a.integer().default(1).required(),
        idx: a.integer().default(1).required(),
        text: a.string().default(""),
        type: a.enum(['prompt', 'response', 'summary'])
    }).authorization((allow) => [allow.owner()]),

    // Customized Queries and Mutations
    identifyObject: a
        .query()
        .arguments({
            path: a.string(),
        })
        .returns(a.string())
        .authorization((allow) => [allow.authenticated()])
        .handler(
            a.handler.custom({
                entry: "./resolver/identifyObject.js",
                dataSource: "RekognitionDataSource",
            })
        ),

    sendConverseCommand: a
        .query() // Change from query to mutation
        .arguments({
            prompt: a.string().required(), // Adjust maxLength as needed
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
        // API Key is used for a.allow.public() rules
        apiKeyAuthorizationMode: {
            expiresInDays: 30,
        },
    },
});

