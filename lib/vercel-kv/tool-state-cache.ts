/**
 * Tool State Cache
 * 
 * This module provides a cache for tool state using Vercel KV.
 * It handles:
 * - Storing and retrieving tool calls
 * - Storing and retrieving tool pipelines
 * - Publishing events for real-time updates
 */

import { kv } from '@vercel/kv';
import { ToolCall, ToolPipeline, ToolStatus } from '@/lib/db/schema-tool-state';

// Cache expiration times in seconds
export const TOOL_CACHE_EXPIRY = {
  TOOL_CALL: 60 * 60 * 24, // 24 hours
  TOOL_PIPELINE: 60 * 60 * 24, // 24 hours
  CHAT_TOOL_CALLS: 60 * 60 * 24, // 24 hours
  CHAT_TOOL_PIPELINES: 60 * 60 * 24, // 24 hours
  EVENT: 60 * 5, // 5 minutes
};

// Event channels
const EVENT_CHANNELS = {
  TOOL_CALL_UPDATED: 'tool-call-updated',
  TOOL_PIPELINE_UPDATED: 'tool-pipeline-updated',
  CHAT_TOOLS_UPDATED: 'chat-tools-updated',
};

/**
 * Publish an event to Redis
 * 
 * @param channel - The event channel
 * @param data - The event data
 */
async function publishEvent(channel: string, data: any): Promise<void> {
  try {
    // Store the update in a list for the SSE endpoint to retrieve
    await kv.lpush(`${channel}:updates`, JSON.stringify(data));
    
    // Set expiry to prevent unlimited growth
    await kv.expire(`${channel}:updates`, TOOL_CACHE_EXPIRY.EVENT);
    
    // Also store the latest state for immediate access
    await kv.set(`${channel}:latest`, JSON.stringify(data), { ex: TOOL_CACHE_EXPIRY.EVENT });
  } catch (error) {
    console.error(`Error publishing event to ${channel}:`, error);
    // Continue execution - this is a non-critical operation
  }
}

/**
 * Get a tool call from the cache
 * 
 * @param toolCallId - The tool call ID
 * @returns The tool call or null if not found
 */
export async function getToolCall(toolCallId: string): Promise<ToolCall | null> {
  try {
    const key = `toolCall:${toolCallId}`;
    return await kv.get(key);
  } catch (error) {
    console.error('Error getting tool call from cache:', error);
    return null;
  }
}

/**
 * Alias for getToolCall for backward compatibility
 */
export const getCachedToolCall = getToolCall;

/**
 * Store a tool call in the cache
 * 
 * @param toolCall - The tool call to store
 * @returns True if successful, false otherwise
 */
export async function storeToolCall(toolCall: ToolCall): Promise<boolean> {
  try {
    const key = `toolCall:${toolCall.id}`;
    
    // Ensure updatedAt is a Date object
    if (typeof toolCall.updatedAt === 'string') {
      toolCall.updatedAt = new Date(toolCall.updatedAt);
    }
    
    await kv.set(key, toolCall, { ex: TOOL_CACHE_EXPIRY.TOOL_CALL });
    
    // Add to chat tool calls list
    if (toolCall.chatId) {
      const chatToolCallsKey = `chat:${toolCall.chatId}:toolCalls`;
      
      // Get existing tool calls for this chat
      const existingToolCalls = await kv.get<ToolCall[]>(chatToolCallsKey) || [];
      
      // Check if this tool call already exists
      const existingIndex = existingToolCalls.findIndex(tc => tc.id === toolCall.id);
      
      if (existingIndex >= 0) {
        // Update existing tool call
        existingToolCalls[existingIndex] = toolCall;
      } else {
        // Add new tool call
        existingToolCalls.push(toolCall);
      }
      
      // Store updated list
      await kv.set(chatToolCallsKey, existingToolCalls, { ex: TOOL_CACHE_EXPIRY.CHAT_TOOL_CALLS });
      
      // Publish event
      await publishEvent(EVENT_CHANNELS.TOOL_CALL_UPDATED, {
        chatId: toolCall.chatId,
        toolCall,
      });
      
      // Also publish a chat tools updated event
      await publishEvent(EVENT_CHANNELS.CHAT_TOOLS_UPDATED, {
        chatId: toolCall.chatId,
        update: {
          type: 'toolCall',
          id: toolCall.id,
        },
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error storing tool call in cache:', error);
    return false;
  }
}

/**
 * Alias for storeToolCall for backward compatibility
 */
export const cacheToolCall = storeToolCall;

/**
 * Clear a tool call from the cache
 * 
 * @param toolCallId - The tool call ID
 * @returns True if successful, false otherwise
 */
export async function clearToolCall(toolCallId: string): Promise<boolean> {
  try {
    const key = `toolCall:${toolCallId}`;
    
    // Get the tool call to find its chat ID
    const toolCall = await getToolCall(toolCallId);
    
    // Delete from cache
    await kv.del(key);
    
    // If it has a chat ID, update the chat's tool calls list
    if (toolCall?.chatId) {
      const chatToolCallsKey = `chat:${toolCall.chatId}:toolCalls`;
      
      // Get existing tool calls for this chat
      const existingToolCalls = await kv.get<ToolCall[]>(chatToolCallsKey) || [];
      
      // Remove this tool call
      const updatedToolCalls = existingToolCalls.filter(tc => tc.id !== toolCallId);
      
      // Store updated list
      await kv.set(chatToolCallsKey, updatedToolCalls, { ex: TOOL_CACHE_EXPIRY.CHAT_TOOL_CALLS });
      
      // Publish event
      await publishEvent(EVENT_CHANNELS.CHAT_TOOLS_UPDATED, {
        chatId: toolCall.chatId,
        update: {
          type: 'toolCall',
          id: toolCallId,
          action: 'delete'
        },
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing tool call from cache:', error);
    return false;
  }
}

/**
 * Alias for clearToolCall for backward compatibility
 */
export const clearCachedToolCall = clearToolCall;

/**
 * Update a tool call's status in the cache
 * 
 * @param toolCallId - The tool call ID
 * @param status - The new status
 * @param result - Optional result data
 * @param error - Optional error message
 * @returns True if successful, false otherwise
 */
export async function updateToolCallStatus(
  toolCallId: string,
  status: ToolStatus,
  result?: any,
  error?: string
): Promise<boolean> {
  try {
    // Get the existing tool call
    const toolCall = await getToolCall(toolCallId);
    if (!toolCall) {
      console.error(`Tool call not found: ${toolCallId}`);
      return false;
    }
    
    // Update the status
    toolCall.status = status;
    
    // Update result if provided
    if (result !== undefined) {
      toolCall.result = result;
    }
    
    // Update error if provided
    if (error !== undefined) {
      toolCall.error = error;
    }
    
    // Update the timestamp
    toolCall.updatedAt = new Date();
    
    // Store the updated tool call
    return await storeToolCall(toolCall);
  } catch (error) {
    console.error('Error updating tool call status in cache:', error);
    return false;
  }
}

/**
 * Cache tool results for backward compatibility
 */
export async function cacheToolResults(
  toolCallId: string,
  results: any
): Promise<boolean> {
  return updateToolCallStatus(toolCallId, ToolStatus.COMPLETED, results);
}

/**
 * Get cached tool results for backward compatibility
 */
export async function getCachedToolResults(toolCallId: string): Promise<any> {
  const toolCall = await getToolCall(toolCallId);
  return toolCall?.result || null;
}

/**
 * Get a tool pipeline from the cache
 * 
 * @param pipelineId - The pipeline ID
 * @returns The pipeline or null if not found
 */
export async function getToolPipeline(pipelineId: string): Promise<ToolPipeline | null> {
  try {
    const key = `toolPipeline:${pipelineId}`;
    return await kv.get(key);
  } catch (error) {
    console.error('Error getting tool pipeline from cache:', error);
    return null;
  }
}

/**
 * Alias for getToolPipeline for backward compatibility
 */
export const getCachedToolPipeline = getToolPipeline;

/**
 * Store a tool pipeline in the cache
 * 
 * @param pipeline - The pipeline to store
 * @returns True if successful, false otherwise
 */
export async function storeToolPipeline(pipeline: ToolPipeline): Promise<boolean> {
  try {
    const key = `toolPipeline:${pipeline.id}`;
    
    // Ensure updatedAt is a Date object
    if (typeof pipeline.updatedAt === 'string') {
      pipeline.updatedAt = new Date(pipeline.updatedAt);
    }
    
    await kv.set(key, pipeline, { ex: TOOL_CACHE_EXPIRY.TOOL_PIPELINE });
    
    // Add to chat tool pipelines list
    if (pipeline.chatId) {
      const chatPipelinesKey = `chat:${pipeline.chatId}:pipelines`;
      
      // Get existing pipelines for this chat
      const existingPipelines = await kv.get<ToolPipeline[]>(chatPipelinesKey) || [];
      
      // Check if this pipeline already exists
      const existingIndex = existingPipelines.findIndex(p => p.id === pipeline.id);
      
      if (existingIndex >= 0) {
        // Update existing pipeline
        existingPipelines[existingIndex] = pipeline;
      } else {
        // Add new pipeline
        existingPipelines.push(pipeline);
      }
      
      // Store updated list
      await kv.set(chatPipelinesKey, existingPipelines, { ex: TOOL_CACHE_EXPIRY.CHAT_TOOL_PIPELINES });
      
      // Publish event
      await publishEvent(EVENT_CHANNELS.TOOL_PIPELINE_UPDATED, {
        chatId: pipeline.chatId,
        pipeline,
      });
      
      // Also publish a chat tools updated event
      await publishEvent(EVENT_CHANNELS.CHAT_TOOLS_UPDATED, {
        chatId: pipeline.chatId,
        update: {
          type: 'pipeline',
          id: pipeline.id,
        },
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error storing tool pipeline in cache:', error);
    return false;
  }
}

/**
 * Alias for storeToolPipeline for backward compatibility
 */
export const cacheToolPipeline = storeToolPipeline;

/**
 * Clear a tool pipeline from the cache
 * 
 * @param pipelineId - The pipeline ID
 * @returns True if successful, false otherwise
 */
export async function clearToolPipeline(pipelineId: string): Promise<boolean> {
  try {
    const key = `toolPipeline:${pipelineId}`;
    
    // Get the pipeline to find its chat ID
    const pipeline = await getToolPipeline(pipelineId);
    
    // Delete from cache
    await kv.del(key);
    
    // If it has a chat ID, update the chat's pipelines list
    if (pipeline?.chatId) {
      const chatPipelinesKey = `chat:${pipeline.chatId}:pipelines`;
      
      // Get existing pipelines for this chat
      const existingPipelines = await kv.get<ToolPipeline[]>(chatPipelinesKey) || [];
      
      // Remove this pipeline
      const updatedPipelines = existingPipelines.filter(p => p.id !== pipelineId);
      
      // Store updated list
      await kv.set(chatPipelinesKey, updatedPipelines, { ex: TOOL_CACHE_EXPIRY.CHAT_TOOL_PIPELINES });
      
      // Publish event
      await publishEvent(EVENT_CHANNELS.CHAT_TOOLS_UPDATED, {
        chatId: pipeline.chatId,
        update: {
          type: 'pipeline',
          id: pipelineId,
          action: 'delete'
        },
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing tool pipeline from cache:', error);
    return false;
  }
}

/**
 * Alias for clearToolPipeline for backward compatibility
 */
export const clearCachedToolPipeline = clearToolPipeline;

/**
 * Get all tool calls for a chat
 * 
 * @param chatId - The chat ID
 * @returns Array of tool calls
 */
export async function getToolCallsByChatId(chatId: string): Promise<ToolCall[]> {
  try {
    const key = `chat:${chatId}:toolCalls`;
    return await kv.get(key) || [];
  } catch (error) {
    console.error('Error getting tool calls by chat ID from cache:', error);
    return [];
  }
}

/**
 * Get all tool pipelines for a chat
 * 
 * @param chatId - The chat ID
 * @returns Array of tool pipelines
 */
export async function getToolPipelinesByChatId(chatId: string): Promise<ToolPipeline[]> {
  try {
    const key = `chat:${chatId}:pipelines`;
    return await kv.get(key) || [];
  } catch (error) {
    console.error('Error getting tool pipelines by chat ID from cache:', error);
    return [];
  }
}