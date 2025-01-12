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

    // Custom Queries and Mutations
    IdentifyObject: a.query()
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

    // Amplify will synthesize this to add an id field
    UserDocument: a.model({
        path: a.string().required(),
        status: a.string().required(),
    })
    .authorization((allow) => [
        allow.owner().to(['read', 'list']),
        allow.custom('function').to(['create', 'read', 'update', 'delete'])
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
        // API Key is used for a.allow.public() rules
        apiKeyAuthorizationMode: {
            expiresInDays: 30,
        },
    },
});
