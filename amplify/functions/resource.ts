import { defineFunction } from "@aws-amplify/backend";

export const chatWithBedrock = defineFunction({
    name: 'chatWithBedrock',
    entry: './chatHandler.ts'
});
