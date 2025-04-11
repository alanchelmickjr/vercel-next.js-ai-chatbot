/**
 * Enhanced AI SDK
 * 
 * This file provides wrapper functions for the Vercel AI SDK functions,
 * extending them with our enhanced functionality like alias resolution
 * and Redis caching.
 * 
 * By using these wrapper functions instead of the Vercel AI SDK functions directly,
 * we can ensure consistent behavior across the application.
 */

import {
  streamText as vercelStreamText,
  experimental_generateImage as vercelGenerateImage,
  embed as vercelEmbed,
  generateText as vercelGenerateText,
  createDataStreamResponse,
  appendResponseMessages,
  smoothStream,
} from 'ai';

import { enhancedLanguageModel, enhancedImageModel, enhancedTextEmbeddingModel } from './provider-registry';
import { toolManager } from '@/lib/tools/tool-manager';
import { ToolStatus } from '@/lib/db/schema-tool-state';
import { tool as enhancedTool, createToolPipeline, ToolExecutionOptions } from '@/lib/tools/tool-wrapper';
import {
  cacheToolCall,
  getCachedToolCall,
  cacheToolResults,
  getCachedToolResults
} from '@/lib/vercel-kv/tool-state-cache';
import { generateUUID } from '@/lib/utils';

/**
 * Enhanced streamText function
 * 
 * Wraps the Vercel AI SDK streamText function with our enhanced model resolution.
 * 
 * @param options The options for streamText
 * @returns The result of the streamText function
 */
export async function streamText(options: any) {
  try {
    // Resolve the model upfront
    const resolvedModel = await enhancedLanguageModel(options.model);
    
    // Extract chat ID and message ID from the messages
    let chatId = 'unknown';
    let messageId = 'unknown';
    let userId = undefined;
    
    if (options.messages && Array.isArray(options.messages) && options.messages.length > 0) {
      // Try to extract chat ID from the first message
      const firstMessage = options.messages[0];
      if (firstMessage && typeof firstMessage === 'object' && 'id' in firstMessage) {
        chatId = String(firstMessage.id).split(':')[0] || chatId;
      }
      
      // Try to extract message ID from the last user message
      const lastUserMessage = [...options.messages].reverse().find(msg =>
        msg && typeof msg === 'object' && 'role' in msg && msg.role === 'user'
      );
      
      if (lastUserMessage && typeof lastUserMessage === 'object' && 'id' in lastUserMessage) {
        messageId = String(lastUserMessage.id);
      }
    }
    
    // Create a tool pipeline if tools are provided
    let pipelineId: string | undefined = undefined;
    if (options.tools && Object.keys(options.tools).length > 0) {
      console.log(`[DEBUG] Creating tool pipeline for chat ${chatId} with ${Object.keys(options.tools).length} tools`);
      console.log(`[DEBUG] Available tools:`, Object.keys(options.tools));
      
      try {
        // Create a pipeline for this chat
        const pipeline = await toolManager.createToolPipeline({
          chatId,
          name: `Chat Pipeline for ${chatId}`,
          totalSteps: Object.keys(options.tools).length,
          metadata: {
            model: options.model,
            resolvedModel
          }
        });
        
        pipelineId = pipeline.id;
        console.log(`[DEBUG] Created pipeline with ID ${pipelineId}`);
      } catch (pipelineError) {
        console.error('Error creating tool pipeline:', pipelineError);
        // Continue without a pipeline
      }
    } else {
      console.log(`[DEBUG] No tools provided or empty tools object`);
    }
    
    // Create a new options object with the resolved model
    // Make sure to preserve all tool-related properties
    const newOptions = {
      ...options,
      model: resolvedModel,
    };
    
    // Wrap the tools with our enhanced tool wrapper
    if (newOptions.tools && pipelineId) {
      console.log(`[DEBUG] Wrapping tools with enhanced tool wrapper for pipeline ${pipelineId}`);
      const originalTools = { ...newOptions.tools };
      const wrappedTools: Record<string, any> = {};
      
      // Define tool execution options with callbacks for tracking
      const toolExecutionOptions: ToolExecutionOptions = {
        reportProgress: true,
        trackHistory: true,
        enableRetry: true,
        onStepStart: (stepInfo) => {
          console.log(`[DEBUG] Tool ${stepInfo.toolName} execution started (step ${stepInfo.stepNumber}/${stepInfo.totalSteps})`);
        },
        onStepFinish: (stepInfo, result) => {
          console.log(`[DEBUG] Tool ${stepInfo.toolName} execution completed (step ${stepInfo.stepNumber}/${stepInfo.totalSteps})`);
          // Cache the result for faster retrieval
          cacheToolResults(`${stepInfo.toolCallId}:result`, result);
        },
        onError: (error, stepInfo) => {
          console.error(`[DEBUG] Tool ${stepInfo.toolName} execution failed:`, error);
        },
        onComplete: (results, metrics) => {
          console.log(`[DEBUG] Tool execution completed in ${metrics.totalDuration}ms with ${metrics.cacheHits} cache hits`);
        }
      };
      
      // Wrap each tool with our enhanced tool wrapper
      Object.entries(originalTools).forEach(([toolName, toolImpl], index) => {
        // Create an enhanced context with pipeline information
        const enhancedContext = {
          pipelineId,
          chatId,
          messageId,
          stepNumber: index + 1,
          totalSteps: Object.keys(originalTools).length
        };
        
        // Wrap the tool with our enhanced tool wrapper
        wrappedTools[toolName] = enhancedTool({
          ...(toolImpl as any),
          name: toolName,
          // Add a custom execute method that includes our enhanced context
          execute: async (args: any, context: any) => {
            const mergedContext = { ...context, ...enhancedContext };
            const originalExecute = (toolImpl as any).execute;
            
            // Check cache first
            const cacheKey = `${chatId}:${toolName}:${JSON.stringify(args)}`;
            const cachedResult = await getCachedToolResults(cacheKey);
            
            if (cachedResult) {
              console.log(`[DEBUG] Cache hit for tool ${toolName} with args ${JSON.stringify(args)}`);
              return cachedResult;
            }
            
            // Execute the original tool
            const result = await originalExecute(args, mergedContext);
            
            // Cache the result
            await cacheToolResults(cacheKey, result);
            
            return result;
          }
        }, toolExecutionOptions);
        
        console.log(`[DEBUG] Tool ${toolName} wrapped successfully with enhanced wrapper`);
      });
      
      // Replace the tools with the wrapped versions
      newOptions.tools = wrappedTools;
      console.log(`[DEBUG] All tools wrapped and replaced in options with enhanced wrappers`);
    } else {
      console.log(`[DEBUG] Not wrapping tools: tools=${!!newOptions.tools}, pipelineId=${pipelineId}`);
    }
    
    // Direct pass-through to ensure tool calls work properly
    return vercelStreamText(newOptions);
  } catch (error) {
    console.error('Error in enhanced streamText:', error);
    // Fall back to the original function with unresolved model
    return vercelStreamText(options);
  }
}

/**
 * Enhanced generateText function
 * 
 * Wraps the Vercel AI SDK generateText function with our enhanced model resolution.
 * 
 * @param options The options for generateText
 * @returns The result of the generateText function
 */
export async function generateText(options: any) {
  try {
    // Resolve the model using our enhanced function
    const resolvedModel = await enhancedLanguageModel(options.model);
    
    // Call the Vercel AI SDK generateText function with the resolved model
    return vercelGenerateText({
      ...options,
      model: resolvedModel,
    });
  } catch (error) {
    console.error('Error in enhanced generateText:', error);
    // Fall back to the original function
    return vercelGenerateText(options);
  }
}

/**
 * Enhanced experimental_generateImage function
 * 
 * Wraps the Vercel AI SDK experimental_generateImage function with our enhanced model resolution.
 * 
 * @param options The options for experimental_generateImage
 * @returns The result of the experimental_generateImage function
 */
export async function experimental_generateImage(options: any) {
  try {
    // Resolve the model using our enhanced function
    const resolvedModel = await enhancedImageModel(options.model);
    
    // Call the Vercel AI SDK experimental_generateImage function with the resolved model
    return vercelGenerateImage({
      ...options,
      model: resolvedModel,
    });
  } catch (error) {
    console.error('Error in enhanced experimental_generateImage:', error);
    // Fall back to the original function
    return vercelGenerateImage(options);
  }
}

/**
 * Enhanced embed function
 * 
 * Wraps the Vercel AI SDK embed function with our enhanced model resolution.
 * 
 * @param options The options for embed
 * @returns The result of the embed function
 */
export async function embed(options: any) {
  try {
    // Resolve the model using our enhanced function
    const resolvedModel = await enhancedTextEmbeddingModel(options.model);
    
    // Call the Vercel AI SDK embed function with the resolved model
    return vercelEmbed({
      ...options,
      model: resolvedModel,
    });
  } catch (error) {
    console.error('Error in enhanced embed:', error);
    // Fall back to the original function
    return vercelEmbed(options);
  }
}

// Re-export other functions from the Vercel AI SDK for convenience
export {
  createDataStreamResponse,
  appendResponseMessages,
  smoothStream,
};

// Re-export types
export type { UIMessage } from 'ai';