import { defineFunction } from "@aws-amplify/backend";

export const chatWithBedrock = defineFunction({
    name: 'chatWithBedrock',
    entry: './chatHandler.ts',
    timeoutSeconds: 30,
});

// See: https://docs.amplify.aws/react/build-a-backend/troubleshooting/circular-dependency/
export const processDocument = defineFunction({
    name: 'processDocument',
    entry: './storageHandler.ts',
    timeoutSeconds: 30
}); 
