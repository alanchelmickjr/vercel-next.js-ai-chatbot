/**
 * Tool Manager
 * 
 * This module provides a central management system for tool calls and pipelines.
 * It handles:
 * - Tool call deduplication
 * - Tool call state tracking
 * - Pipeline management
 * - Dependency resolution
 * - Error recovery
 */

import { generateUUID } from '@/lib/utils';
import { db } from '@/lib/db/connection';
import { eq, desc } from 'drizzle-orm';

import { 
  ToolCall, 
  ToolPipeline, 
  ToolStatus,
  toolPipeline
} from '@/lib/db/schema-tool-state';

import {
  createToolCall,
  getToolCallById,
  getToolCallsByChatId,
  getToolCallsByMessageId,
  updateToolCallStatus,
  incrementToolCallRetryCount,
  createToolPipeline,
  getToolPipelineById,
  updateToolPipelineStatus,
  getToolCallsByPipelineId,
  getSystemUserId
} from '@/lib/db/queries/tool-state';

import {
  getCachedToolCall,
  getCachedToolPipeline,
  getCachedToolResults,
  cacheToolPipeline
} from '@/lib/vercel-kv/tool-state-cache';

// Maximum number of retries for failed tool calls
const MAX_RETRIES = 3;

// Set to true to enable debug logging
const DEBUG = true;

/**
 * Tool call options
 */
interface ToolCallOptions {
  // userId field removed to match actual database schema
  chatId: string;
  messageId: string;
  toolName: string;
  toolCallId: string;
  args: any;
  parentToolCallId?: string;
  pipelineId?: string;
  stepNumber?: number;
}

/**
 * Tool Manager class
 * 
 * Provides methods for managing tool calls and pipelines
 */
class ToolManager {
  /**
   * Process a tool call
   * 
   * @param options - The tool call options
   * @returns The tool call
   */
  public async processToolCall(options: ToolCallOptions): Promise<ToolCall> {
    try {
      console.log(`[ToolManager] processToolCall called with options:`, JSON.stringify(options));
      
      // Check if a tool call with the same ID already exists
      const existingToolCall = await this.findExistingToolCall(options.toolCallId);
      
      if (existingToolCall) {
        console.log(`[ToolManager] Tool call ${options.toolCallId} already exists, returning existing call`);
        return existingToolCall;
      }
      
      console.log(`[ToolManager] Creating new tool call for ${options.toolName}`);
      
      // Create a new tool call record
      const toolCallData: Omit<ToolCall, 'createdAt' | 'updatedAt'> = {
        id: options.toolCallId,
        // userId field removed to match actual database schema
        chatId: options.chatId,
        messageId: options.messageId,
        toolName: options.toolName,
        toolCallId: options.toolCallId,
        args: options.args,
        status: ToolStatus.PENDING,
        result: null,
        error: null,
        retryCount: 0,
        parentToolCallId: options.parentToolCallId || null,
        pipelineId: options.pipelineId || null,
        stepNumber: options.stepNumber !== undefined ? options.stepNumber : null
      };
      
      // Create the tool call in the database
      console.log(`[ToolManager] Creating tool call in database:`, JSON.stringify(toolCallData));
      const toolCall = await createToolCall(toolCallData);
      console.log(`[ToolManager] Tool call created with ID ${toolCall.id}`);
      
      // Update the tool call status to PROCESSING
      console.log(`[ToolManager] Updating tool call status to PROCESSING`);
      const updatedToolCall = await updateToolCallStatus(
        toolCall.id,
        ToolStatus.PROCESSING
      );
      console.log(`[ToolManager] Tool call status updated successfully`);
      
      // If this tool call is part of a pipeline, update the pipeline status
      if (options.pipelineId && options.stepNumber !== undefined) {
        console.log(`[ToolManager] Tool call is part of pipeline ${options.pipelineId}, step ${options.stepNumber}`);
        const pipeline = await this.getToolPipelineById(options.pipelineId);
        
        if (pipeline) {
          console.log(`[ToolManager] Found pipeline ${pipeline.id}, updating status to PROCESSING for step ${options.stepNumber}`);
          // Update the pipeline status and current step
          await updateToolPipelineStatus(
            pipeline.id,
            ToolStatus.PROCESSING,
            options.stepNumber
          );
          console.log(`[ToolManager] Pipeline status updated successfully`);
        } else {
          console.log(`[ToolManager] Pipeline ${options.pipelineId} not found`);
        }
      } else {
        console.log(`[ToolManager] Tool call is not part of a pipeline`);
      }
      
      return updatedToolCall || toolCall;
    } catch (error) {
      console.error('Error processing tool call:', error);
      throw error;
    }
  }

  /**
   * Find an existing tool call by ID
   * 
   * @param toolCallId - The tool call ID
   * @returns The tool call or undefined if not found
   */
  public async findExistingToolCall(toolCallId: string): Promise<ToolCall | undefined> {
    try {
      // Try to get from cache first
      const cachedToolCall = await getCachedToolCall(toolCallId);
      if (cachedToolCall) {
        if (DEBUG) console.log(`Cache hit for tool call ${toolCallId}`);
        return cachedToolCall;
      }
      
      // If not in cache, get from database
      const toolCall = await getToolCallById(toolCallId);
      
      return toolCall;
    } catch (error) {
      console.error('Error finding existing tool call:', error);
      return undefined;
    }
  }

  /**
   * Get tool calls for a chat
   * 
   * @param chatId - The chat ID
   * @returns Array of tool calls
   */
  public async getToolCallsByChatId(chatId: string): Promise<ToolCall[]> {
    try {
      return await getToolCallsByChatId(chatId);
    } catch (error) {
      console.error('Error getting tool calls by chat ID:', error);
      throw error;
    }
  }

  /**
   * Get pipelines for a chat
   *
   * @param chatId - The chat ID
   * @returns Array of pipelines
   */
  public async getPipelinesByChatId(chatId: string): Promise<ToolPipeline[]> {
    try {
      // Check if the chat exists first
      try {
        // This would typically check cache first, but for now we'll just query the database
        const pipelines = await db
          .select()
          .from(toolPipeline)
          .where(eq(toolPipeline.chatId, chatId))
          .orderBy(desc(toolPipeline.createdAt));
        
        // Cache each pipeline
        for (const pipeline of pipelines) {
          await cacheToolPipeline(pipeline);
        }
        
        return pipelines;
      } catch (dbError) {
        // If there's a database error, it might be because the chat doesn't exist yet
        if (DEBUG) console.log(`No pipelines found for chat ID: ${chatId}. Chat might not exist yet.`);
        // Return an empty array instead of throwing an error
        return [];
      }
    } catch (error) {
      console.error('Error getting pipelines by chat ID:', error);
      // Return an empty array instead of throwing an error
      return [];
    }
  }

  /**
   * Get a tool pipeline by ID
   * 
   * @param pipelineId - The pipeline ID
   * @returns The tool pipeline or undefined if not found
   */
  public async getToolPipelineById(pipelineId: string): Promise<ToolPipeline | undefined> {
    try {
      // Check cache first
      const cachedPipeline = await getCachedToolPipeline(pipelineId);
      if (cachedPipeline) {
        return cachedPipeline;
      }
      
      // If not in cache, get from database
      const pipeline = await getToolPipelineById(pipelineId);
      
      // Cache the pipeline if found
      if (pipeline) {
        await cacheToolPipeline(pipeline);
      }
      
      return pipeline;
    } catch (error) {
      console.error('Error getting tool pipeline by ID:', error);
      // Return undefined instead of throwing an error
      // This allows the caller to handle the case where the pipeline doesn't exist yet
      return undefined;
    }
  }

  /**
   * Get tool calls for a pipeline
   * 
   * @param pipelineId - The pipeline ID
   * @returns Array of tool calls
   */
  public async getToolCallsByPipelineId(pipelineId: string): Promise<ToolCall[]> {
    try {
      return await getToolCallsByPipelineId(pipelineId);
    } catch (error) {
      console.error('Error getting tool calls by pipeline ID:', error);
      // Return an empty array instead of throwing an error
      // This handles the case where the pipeline doesn't exist yet
      return [];
    }
  }

  /**
   * Create a tool pipeline
   *
   * @param options - The pipeline options
   * @returns The created pipeline
   */
  public async createToolPipeline(options: {
    // userId field removed to match actual database schema
    chatId: string;
    name: string;
    totalSteps: number;
    metadata?: any;
  }): Promise<ToolPipeline> {
    try {
      // Generate a unique ID for the pipeline
      const pipelineId = generateUUID();
      
      // Create the pipeline data
      const pipelineData: Omit<ToolPipeline, 'createdAt' | 'updatedAt'> = {
        id: pipelineId,
        // userId field removed to match actual database schema
        chatId: options.chatId,
        name: options.name,
        status: ToolStatus.PENDING,
        currentStep: 0,
        totalSteps: options.totalSteps,
        metadata: options.metadata || null
      };
      
      // Create the pipeline in the database
      const pipeline = await createToolPipeline(pipelineData);
      
      return pipeline;
    } catch (error) {
      console.error('Error creating tool pipeline:', error);
      throw error;
    }
  }
  /**
   * Update a tool call's status and result
   *
   * @param toolCallId - The ID of the tool call
   * @param status - The new status
   * @param result - Optional result data
   * @param error - Optional error message
   * @returns The updated tool call
   */
  public async updateToolCallStatus(
    toolCallId: string,
    status: ToolStatus,
    result?: any,
    error?: string
  ): Promise<ToolCall | undefined> {
    try {
      // Update the tool call status
      const updatedToolCall = await updateToolCallStatus(toolCallId, status, result, error);
      
      if (!updatedToolCall) {
        return undefined;
      }
      
      // If this tool call is part of a pipeline, update the pipeline status
      if (updatedToolCall.pipelineId) {
        const pipeline = await this.getToolPipelineById(updatedToolCall.pipelineId);
        
        if (pipeline) {
          // Get all tool calls for this pipeline
          const toolCalls = await this.getToolCallsByPipelineId(pipeline.id);
          
          // Check if all tool calls are completed, if any have failed, or if any are awaiting approval
          const allCompleted = toolCalls.every(call => call.status === ToolStatus.COMPLETED);
          const anyFailed = toolCalls.some(call => call.status === ToolStatus.FAILED);
          const anyRejected = toolCalls.some(call => call.status === ToolStatus.REJECTED);
          const anyAwaitingApproval = toolCalls.some(call => call.status === ToolStatus.AWAITING_APPROVAL);
          
          // Update pipeline status based on tool call statuses
          if (anyFailed || anyRejected) {
            await this.updateToolPipelineStatus(pipeline.id, ToolStatus.FAILED);
          } else if (allCompleted) {
            await this.updateToolPipelineStatus(
              pipeline.id,
              ToolStatus.COMPLETED,
              pipeline.totalSteps
            );
          } else if (anyAwaitingApproval) {
            await this.updateToolPipelineStatus(
              pipeline.id,
              ToolStatus.AWAITING_APPROVAL,
              updatedToolCall.stepNumber || 0
            );
          } else if (status === ToolStatus.PROCESSING) {
            // If the current tool is processing, update the pipeline step
            const currentStep = updatedToolCall.stepNumber || 0;
            await this.updateToolPipelineStatus(
              pipeline.id,
              ToolStatus.PROCESSING,
              currentStep
            );
          }
        }
      }
      
      return updatedToolCall;
    } catch (error) {
      console.error('Error updating tool call status:', error);
      throw error;
    }
  }

  /**
   * Update a tool pipeline's status and metadata
   *
   * @param pipelineId - The ID of the pipeline
   * @param status - The new status
   * @param currentStep - Optional current step number
   * @param metadata - Optional metadata
   * @returns The updated pipeline
   */
  public async updateToolPipelineStatus(
    pipelineId: string,
    status: ToolStatus,
    currentStep?: number,
    metadata?: any
  ): Promise<ToolPipeline | undefined> {
    try {
      // Update the pipeline status
      const updatedPipeline = await updateToolPipelineStatus(
        pipelineId,
        status,
        currentStep,
        metadata
      );
      
      return updatedPipeline;
    } catch (error) {
      console.error('Error updating tool pipeline status:', error);
      throw error;
    }
  }

}

// Export a singleton instance
export const toolManager = new ToolManager();