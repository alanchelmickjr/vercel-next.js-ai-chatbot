/**
 * Tool Management Database Functions
 * 
 * This module contains functions for managing tool-related operations:
 * - Creating, retrieving, and updating tool calls
 * - Managing tool pipelines
 * - Handling tool call status updates
 * - Cleaning up stale or orphaned tool calls
 */

import 'server-only';
import { and, eq, gt, lt, desc, inArray } from 'drizzle-orm';
import { generateUUID } from '@/lib/utils';

import { db } from '../connection';
import { 
  toolCall, 
  toolPipeline, 
  ToolCall, 
  ToolPipeline, 
  ToolStatus,
  SYSTEM_USER_IDS
} from '../schema-tool-state';

import {
  cacheToolCall,
  getCachedToolCall,
  cacheToolPipeline,
  getCachedToolPipeline,
  cacheToolResults,
  getCachedToolResults,
  clearCachedToolCall,
  clearCachedToolPipeline
} from '@/lib/vercel-kv/tool-state-cache';

// Set to true to enable debug logging
const DEBUG = true;

/**
 * Create a new tool call
 * 
 * @param data - The tool call data
 * @returns Promise resolving to the created tool call
 */
export async function createToolCall(data: Omit<ToolCall, 'createdAt' | 'updatedAt'>): Promise<ToolCall> {
  try {
    if (DEBUG) console.log(`[DB] Creating tool call with data:`, JSON.stringify(data));
    
    // Ensure we have an ID
    const toolCallData = {
      ...data,
      id: data.id || generateUUID()
    };
    
    // Remove userId field if it exists (to match actual database schema)
    if ('userId' in toolCallData) {
      delete (toolCallData as any).userId;
    }

    if (DEBUG) console.log(`[DB] Inserting tool call with ID ${toolCallData.id} into database`);
    // Insert into database
    await db.insert(toolCall).values(toolCallData);
    
    if (DEBUG) console.log(`[DB] Retrieving inserted tool call ${toolCallData.id}`);
    // Retrieve the inserted tool call to get the timestamps
    const [insertedToolCall] = await db
      .select()
      .from(toolCall)
      .where(eq(toolCall.id, toolCallData.id));
    
    if (!insertedToolCall) {
      console.error(`[DB] Failed to retrieve inserted tool call ${toolCallData.id}`);
      throw new Error(`Failed to retrieve inserted tool call ${toolCallData.id}`);
    }
    
    if (DEBUG) console.log(`[DB] Caching tool call ${insertedToolCall.id}`);
    // Cache the tool call
    await cacheToolCall(insertedToolCall);
    
    if (DEBUG) console.log(`[DB] Successfully created tool call ${insertedToolCall.id}`);
    return insertedToolCall;
  } catch (error) {
    console.error('Failed to create tool call in database:', error);
    throw error;
  }
}

/**
 * Get a tool call by ID
 * 
 * @param id - The ID of the tool call
 * @returns Promise resolving to the tool call or undefined if not found
 */
export async function getToolCallById(id: string): Promise<ToolCall | undefined> {
  try {
    // Try to get from cache first
    const cachedToolCall = await getCachedToolCall(id);
    if (cachedToolCall) {
      if (DEBUG) console.log(`Cache hit for tool call ${id}`);
      return cachedToolCall;
    }
    
    // If not in cache, get from database
    const [foundToolCall] = await db
      .select()
      .from(toolCall)
      .where(eq(toolCall.id, id));
    
    // Cache the result if found
    if (foundToolCall) {
      await cacheToolCall(foundToolCall);
    }
    
    return foundToolCall;
  } catch (error) {
    console.error('Failed to get tool call by id from database:', error);
    throw error;
  }
}

/**
 * Get tool calls by chat ID
 * 
 * @param chatId - The ID of the chat
 * @returns Promise resolving to an array of tool calls
 */
export async function getToolCallsByChatId(chatId: string): Promise<ToolCall[]> {
  try {
    const toolCalls = await db
      .select()
      .from(toolCall)
      .where(eq(toolCall.chatId, chatId))
      .orderBy(desc(toolCall.createdAt));
    
    // Cache each tool call
    for (const call of toolCalls) {
      await cacheToolCall(call);
    }
    
    return toolCalls;
  } catch (error) {
    console.error('Failed to get tool calls by chat id from database:', error);
    throw error;
  }
}

/**
 * Get tool calls by message ID
 * 
 * @param messageId - The ID of the message
 * @returns Promise resolving to an array of tool calls
 */
export async function getToolCallsByMessageId(messageId: string): Promise<ToolCall[]> {
  try {
    const toolCalls = await db
      .select()
      .from(toolCall)
      .where(eq(toolCall.messageId, messageId))
      .orderBy(desc(toolCall.createdAt));
    
    // Cache each tool call
    for (const call of toolCalls) {
      await cacheToolCall(call);
    }
    
    return toolCalls;
  } catch (error) {
    console.error('Failed to get tool calls by message id from database:', error);
    throw error;
  }
}

/**
 * Update a tool call's status
 * 
 * @param id - The ID of the tool call
 * @param status - The new status
 * @param result - Optional result data
 * @param error - Optional error message
 * @returns Promise resolving to the updated tool call
 */
export async function updateToolCallStatus(
  id: string,
  status: ToolStatus,
  result?: any,
  error?: string
): Promise<ToolCall | undefined> {
  try {
    // Prepare update data
    const updateData: Partial<ToolCall> = { status };
    
    if (result !== undefined) {
      updateData.result = result;
      // Also cache the result separately for efficient retrieval
      await cacheToolResults(id, result);
    }
    
    if (error !== undefined) {
      updateData.error = error;
    }
    
    // Update in database
    await db
      .update(toolCall)
      .set(updateData)
      .where(eq(toolCall.id, id));
    
    // Get the updated tool call
    const [updatedToolCall] = await db
      .select()
      .from(toolCall)
      .where(eq(toolCall.id, id));
    
    // Update cache
    if (updatedToolCall) {
      await cacheToolCall(updatedToolCall);
    }
    
    return updatedToolCall;
  } catch (error) {
    console.error('Failed to update tool call status in database:', error);
    throw error;
  }
}

/**
 * Increment a tool call's retry count
 * 
 * @param id - The ID of the tool call
 * @returns Promise resolving to the updated tool call
 */
export async function incrementToolCallRetryCount(id: string): Promise<ToolCall | undefined> {
  try {
    // Get current tool call
    const [currentToolCall] = await db
      .select()
      .from(toolCall)
      .where(eq(toolCall.id, id));
    
    if (!currentToolCall) {
      return undefined;
    }
    
    // Increment retry count
    const newRetryCount = (currentToolCall.retryCount || 0) + 1;
    
    // Update in database
    await db
      .update(toolCall)
      .set({ 
        retryCount: newRetryCount,
        status: ToolStatus.PENDING // Reset to pending for retry
      })
      .where(eq(toolCall.id, id));
    
    // Get the updated tool call
    const [updatedToolCall] = await db
      .select()
      .from(toolCall)
      .where(eq(toolCall.id, id));
    
    // Update cache
    if (updatedToolCall) {
      await cacheToolCall(updatedToolCall);
    }
    
    return updatedToolCall;
  } catch (error) {
    console.error('Failed to increment tool call retry count in database:', error);
    throw error;
  }
}

/**
 * Create a new tool pipeline
 * 
 * @param data - The tool pipeline data
 * @returns Promise resolving to the created tool pipeline
 */
export async function createToolPipeline(data: Omit<ToolPipeline, 'createdAt' | 'updatedAt'>): Promise<ToolPipeline> {
  try {
    if (DEBUG) console.log(`[DB] Creating tool pipeline with data:`, JSON.stringify(data));
    
    // Ensure we have an ID
    const pipelineData = {
      ...data,
      id: data.id || generateUUID()
    };
    
    // Remove userId field if it exists (to match actual database schema)
    if ('userId' in pipelineData) {
      delete (pipelineData as any).userId;
    }

    if (DEBUG) console.log(`[DB] Inserting tool pipeline with ID ${pipelineData.id} into database`);
    // Insert into database
    await db.insert(toolPipeline).values(pipelineData);
    
    if (DEBUG) console.log(`[DB] Retrieving inserted tool pipeline ${pipelineData.id}`);
    // Retrieve the inserted pipeline to get the timestamps
    const [insertedPipeline] = await db
      .select()
      .from(toolPipeline)
      .where(eq(toolPipeline.id, pipelineData.id));
    
    if (!insertedPipeline) {
      console.error(`[DB] Failed to retrieve inserted tool pipeline ${pipelineData.id}`);
      throw new Error(`Failed to retrieve inserted tool pipeline ${pipelineData.id}`);
    }
    
    if (DEBUG) console.log(`[DB] Caching tool pipeline ${insertedPipeline.id}`);
    // Cache the pipeline
    await cacheToolPipeline(insertedPipeline);
    
    if (DEBUG) console.log(`[DB] Successfully created tool pipeline ${insertedPipeline.id}`);
    return insertedPipeline;
  } catch (error) {
    console.error('Failed to create tool pipeline in database:', error);
    throw error;
  }
}

/**
 * Get a tool pipeline by ID
 * 
 * @param id - The ID of the tool pipeline
 * @returns Promise resolving to the tool pipeline or undefined if not found
 */
export async function getToolPipelineById(id: string): Promise<ToolPipeline | undefined> {
  try {
    // Try to get from cache first
    const cachedPipeline = await getCachedToolPipeline(id);
    if (cachedPipeline) {
      if (DEBUG) console.log(`Cache hit for tool pipeline ${id}`);
      return cachedPipeline;
    }
    
    // If not in cache, get from database
    const [foundPipeline] = await db
      .select()
      .from(toolPipeline)
      .where(eq(toolPipeline.id, id));
    
    // Cache the result if found
    if (foundPipeline) {
      await cacheToolPipeline(foundPipeline);
    }
    
    return foundPipeline;
  } catch (error) {
    console.error('Failed to get tool pipeline by id from database:', error);
    throw error;
  }
}

/**
 * Update a tool pipeline's status and current step
 * 
 * @param id - The ID of the tool pipeline
 * @param status - The new status
 * @param currentStep - The current step number
 * @param metadata - Optional metadata
 * @returns Promise resolving to the updated tool pipeline
 */
export async function updateToolPipelineStatus(
  id: string,
  status: ToolStatus,
  currentStep?: number,
  metadata?: any
): Promise<ToolPipeline | undefined> {
  try {
    // Prepare update data
    const updateData: Partial<ToolPipeline> = { status };
    
    if (currentStep !== undefined) {
      updateData.currentStep = currentStep;
    }
    
    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }
    
    // Update in database
    await db
      .update(toolPipeline)
      .set(updateData)
      .where(eq(toolPipeline.id, id));
    
    // Get the updated pipeline
    const [updatedPipeline] = await db
      .select()
      .from(toolPipeline)
      .where(eq(toolPipeline.id, id));
    
    // Update cache
    if (updatedPipeline) {
      await cacheToolPipeline(updatedPipeline);
    }
    
    return updatedPipeline;
  } catch (error) {
    console.error('Failed to update tool pipeline status in database:', error);
    throw error;
  }
}

/**
 * Get tool calls by pipeline ID
 * 
 * @param pipelineId - The ID of the pipeline
 * @returns Promise resolving to an array of tool calls
 */
export async function getToolCallsByPipelineId(pipelineId: string): Promise<ToolCall[]> {
  try {
    const toolCalls = await db
      .select()
      .from(toolCall)
      .where(eq(toolCall.pipelineId, pipelineId))
      .orderBy(toolCall.stepNumber);
    
    // Cache each tool call
    for (const call of toolCalls) {
      await cacheToolCall(call);
    }
    
    return toolCalls;
  } catch (error) {
    console.error('Failed to get tool calls by pipeline id from database:', error);
    throw error;
  }
}

/**
 * Clean up stale tool calls
 * 
 * @param olderThan - Date threshold for stale tool calls
 * @returns Promise resolving to the number of deleted tool calls
 */
export async function cleanupStaleToolCalls(olderThan: Date): Promise<number> {
  try {
    // Find stale tool calls
    const staleCalls = await db
      .select({ id: toolCall.id })
      .from(toolCall)
      .where(
        and(
          lt(toolCall.createdAt, olderThan),
          inArray(toolCall.status, [ToolStatus.PENDING, ToolStatus.PROCESSING])
        )
      );
    
    const staleCallIds = staleCalls.map(call => call.id);
    
    if (staleCallIds.length === 0) {
      return 0;
    }
    
    // Delete from database
    await db
      .delete(toolCall)
      .where(inArray(toolCall.id, staleCallIds));
    
    // Clear from cache
    for (const id of staleCallIds) {
      await clearCachedToolCall(id);
    }
    
    return staleCallIds.length;
  } catch (error) {
    console.error('Failed to clean up stale tool calls from database:', error);
    throw error;
  }
}

/**
 * Clean up stale tool pipelines
 * 
 * @param olderThan - Date threshold for stale pipelines
 * @returns Promise resolving to the number of deleted pipelines
 */
export async function cleanupStaleToolPipelines(olderThan: Date): Promise<number> {
  try {
    // Find stale pipelines
    const stalePipelines = await db
      .select({ id: toolPipeline.id })
      .from(toolPipeline)
      .where(
        and(
          lt(toolPipeline.createdAt, olderThan),
          inArray(toolPipeline.status, [ToolStatus.PENDING, ToolStatus.PROCESSING])
        )
      );
    
    const stalePipelineIds = stalePipelines.map(pipeline => pipeline.id);
    
    if (stalePipelineIds.length === 0) {
      return 0;
    }
    
    // Delete from database
    await db
      .delete(toolPipeline)
      .where(inArray(toolPipeline.id, stalePipelineIds));
    
    // Clear from cache
    for (const id of stalePipelineIds) {
      await clearCachedToolPipeline(id);
    }
    
    return stalePipelineIds.length;
  } catch (error) {
    console.error('Failed to clean up stale tool pipelines from database:', error);
    throw error;
  }
}

/**
 * Get system user ID for system-initiated tools
 * 
 * @param systemId - Optional specific system ID to use
 * @returns A system user ID
 */
export function getSystemUserId(systemId?: string): string {
  if (systemId && SYSTEM_USER_IDS[systemId as keyof typeof SYSTEM_USER_IDS]) {
    return SYSTEM_USER_IDS[systemId as keyof typeof SYSTEM_USER_IDS];
  }
  
  // Default to SYSTEM01
  return SYSTEM_USER_IDS.SYSTEM01;
}