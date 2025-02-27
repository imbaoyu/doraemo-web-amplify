#!/usr/bin/env node

/**
 * This script updates the SSM parameter with the current ChatProcessor Lambda name.
 * Run this script after deploying the ChatProcessor Lambda.
 * 
 * Usage: node update-chat-processor-name.js [functionName]
 * 
 * If functionName is not provided, it will try to find the function by listing Lambda functions
 * with the prefix "DoraemoCdkStack-ChatProcessor".
 */

const { SSMClient, PutParameterCommand } = require('@aws-sdk/client-ssm');
const { LambdaClient, ListFunctionsCommand } = require('@aws-sdk/client-lambda');

const REGION = 'us-east-1';
const PARAMETER_NAME = '/doraemo/chat-processor-name';
const FUNCTION_PREFIX = 'DoraemoCdkStack-ChatProcessor';

async function updateChatProcessorName() {
  try {
    // Get the function name from command line args or find it
    let functionName = process.argv[2];
    
    if (!functionName) {
      console.log(`No function name provided, searching for functions with prefix "${FUNCTION_PREFIX}"...`);
      functionName = await findChatProcessorFunction();
      
      if (!functionName) {
        console.error('Could not find the ChatProcessor function. Please provide the function name as an argument.');
        process.exit(1);
      }
    }
    
    console.log(`Updating SSM parameter ${PARAMETER_NAME} with function name: ${functionName}`);
    
    // Update the SSM parameter
    const ssmClient = new SSMClient({ region: REGION });
    const command = new PutParameterCommand({
      Name: PARAMETER_NAME,
      Value: functionName,
      Type: 'String',
      Overwrite: true,
      Description: 'Name of the ChatProcessor Lambda function'
    });
    
    const response = await ssmClient.send(command);
    console.log('SSM parameter updated successfully:', response);
    
  } catch (error) {
    console.error('Error updating SSM parameter:', error);
    process.exit(1);
  }
}

async function findChatProcessorFunction() {
  try {
    const lambdaClient = new LambdaClient({ region: REGION });
    const command = new ListFunctionsCommand({});
    
    const response = await lambdaClient.send(command);
    
    // Find functions that match the prefix
    const matchingFunctions = response.Functions.filter(fn => 
      fn.FunctionName.startsWith(FUNCTION_PREFIX)
    );
    
    if (matchingFunctions.length === 0) {
      console.error(`No functions found with prefix "${FUNCTION_PREFIX}"`);
      return null;
    }
    
    if (matchingFunctions.length > 1) {
      console.log('Multiple matching functions found:');
      matchingFunctions.forEach((fn, i) => {
        console.log(`${i + 1}. ${fn.FunctionName} (${fn.LastModified})`);
      });
      
      // Return the most recently modified function
      const mostRecent = matchingFunctions.sort((a, b) => 
        new Date(b.LastModified) - new Date(a.LastModified)
      )[0];
      
      console.log(`Using the most recently modified function: ${mostRecent.FunctionName}`);
      return mostRecent.FunctionName;
    }
    
    // Only one function found
    console.log(`Found function: ${matchingFunctions[0].FunctionName}`);
    return matchingFunctions[0].FunctionName;
    
  } catch (error) {
    console.error('Error finding ChatProcessor function:', error);
    return null;
  }
}

updateChatProcessorName(); 