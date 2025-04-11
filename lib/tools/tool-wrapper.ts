/**
 * Tool Wrapper
 *
 * This module provides a wrapper for the AI SDK's tool function that integrates
 * with our tool manager for tracking tool calls and pipelines.
 * 
 * Features:
 * - Step-based execution tracking
 * - Progress reporting
 * - Execution history
 * - Error handling and recovery
 * - Performance metrics
 * - Redis caching for improved performance
 */

import { tool as aiTool } from 'ai';
import { toolManager } from './tool-manager';
import { ToolStatus } from '@/lib/db/schema-tool-state';
import { generateUUID } from '@/lib/utils';
import {
  cacheToolCall,
  getCachedToolCall,
  cacheToolResults,
  getCachedToolResults,
  TOOL_CACHE_EXPIRY
} from '@/lib/vercel-kv/tool-state-cache';

// Configuration options for tool execution
export interface ToolExecutionOptions {
  maxSteps?: number;
  reportProgress?: boolean;
  trackHistory?: boolean;
  enableRetry?: boolean;
  timeout?: number;
  requireApproval?: boolean;
  onStepStart?: (stepInfo: ToolStepInfo) => void;
  onStepFinish?: (stepInfo: ToolStepInfo, result: any) => void;
  onError?: (error: Error, stepInfo: ToolStepInfo) => void;
  onComplete?: (results: any[], metrics: ToolExecutionMetrics) => void;
  onApprovalRequired?: (stepInfo: ToolStepInfo) => void;
}

// Information about a tool execution step
export interface ToolStepInfo {
  toolName: string;
  toolCallId: string;
  stepNumber: number;
  totalSteps: number;
  startTime: Date;
  endTime?: Date;
  status: ToolStatus;
  args: any;
  pipelineId?: string;
  chatId: string;
  messageId: string;
}

// Metrics for tool execution
export interface ToolExecutionMetrics {
  totalDuration: number;
  stepDurations: Record<string, number>;
  startTime: Date;
  endTime: Date;
  successRate: number;
  retryCount: number;
  cacheHits: number;
  cacheMisses: number;
}

// Default execution options
const DEFAULT_EXECUTION_OPTIONS: ToolExecutionOptions = {
  maxSteps: 10,
  reportProgress: true,
  trackHistory: true,
  enableRetry: true,
  timeout: 30000, // 30 seconds
  requireApproval: false, // By default, don't require approval
};

/**
 * Wrap a tool with tool manager integration
 *
 * @param options - The tool options
 * @param executionOptions - Options for tool execution
 * @returns The wrapped tool
 */
export function tool(options: any, executionOptions: Partial<ToolExecutionOptions> = {}) {
  // Create the original tool
  const originalTool = aiTool(options);
  
  // Merge default options with provided options
  const mergedExecutionOptions = {
    ...DEFAULT_EXECUTION_OPTIONS,
    ...executionOptions,
  };
  
  // Store execution metrics
  const metrics: ToolExecutionMetrics = {
    totalDuration: 0,
    stepDurations: {},
    startTime: new Date(),
    endTime: new Date(),
    successRate: 0,
    retryCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };
  
  // Wrap the tool's execute function to add our enhanced functionality
  const wrappedTool = {
    ...originalTool,
    execute: async (args: any, context: any) => {
      // Start tracking execution time
      const executionStartTime = Date.now();
      metrics.startTime = new Date();
      
      // Generate a tool call ID if not provided
      const toolCallId = (context && context.toolCallId) || generateUUID();
      
      // Extract chat ID and message ID from context
      const chatId = (context && context.chatId) || 'unknown';
      const messageId = (context && context.messageId) || 'unknown';
      const pipelineId = context && context.pipelineId;
      const stepNumber = context && context.stepNumber;
      
      // Check if we have cached results for this exact tool call with these args
      const cacheKey = `${toolCallId}:${JSON.stringify(args)}`;
      const cachedResults = await getCachedToolResults(cacheKey);
      
      if (cachedResults && !mergedExecutionOptions.enableRetry) {
        // We found cached results and retries are disabled, so use the cache
        metrics.cacheHits++;
        
        // Create a step info object for the cached execution
        const stepInfo: ToolStepInfo = {
          toolName: options.name || 'unknown',
          toolCallId,
          stepNumber: stepNumber || 1,
          totalSteps: 1,
          startTime: new Date(),
          endTime: new Date(),
          status: ToolStatus.COMPLETED,
          args,
          pipelineId,
          chatId,
          messageId,
        };
        
        // Call the onStepFinish callback if provided
        if (mergedExecutionOptions.onStepFinish) {
          mergedExecutionOptions.onStepFinish(stepInfo, cachedResults);
        }
        
        return cachedResults;
      }
      
      // No cached results or retries are enabled, so execute the tool
      metrics.cacheMisses++;
      
      // Create a step info object
      const stepInfo: ToolStepInfo = {
        toolName: options.name || 'unknown',
        toolCallId,
        stepNumber: stepNumber || 1,
        totalSteps: 1,
        startTime: new Date(),
        status: ToolStatus.PROCESSING,
        args,
        pipelineId,
        chatId,
        messageId,
      };
      
      // Call the onStepStart callback if provided
      if (mergedExecutionOptions.onStepStart) {
        mergedExecutionOptions.onStepStart(stepInfo);
      }
      
      // Emit detailed execution event for tool execution start
      console.log(`[ToolWrapper] Tool execution started: ${options.name || 'unknown'}`);
      
      try {
        // Create a tool call record
        const toolCall = await toolManager.processToolCall({
          chatId,
          messageId,
          toolName: options.name || 'unknown',
          toolCallId,
          args,
          pipelineId,
          stepNumber: stepNumber || 1,
        });
        
        // Cache the tool call
        await cacheToolCall(toolCall);
        
        // Check if approval is required
        if (mergedExecutionOptions.requireApproval) {
          console.log(`[ToolWrapper] Tool execution requires approval: ${options.name || 'unknown'}`);
          
          // Update the tool call status to awaiting approval
          await toolManager.updateToolCallStatus(
            toolCall.id,
            ToolStatus.AWAITING_APPROVAL
          );
          
          // Call the onApprovalRequired callback if provided
          if (mergedExecutionOptions.onApprovalRequired) {
            mergedExecutionOptions.onApprovalRequired(stepInfo);
          }
          
          // Wait for approval (this will be handled by the UI)
          // The actual execution will be triggered by a separate API call
          // For now, we'll throw a special error to indicate approval is required
          throw new Error('APPROVAL_REQUIRED');
        }
        
        // If approval is not required or already granted, proceed with execution
        // Emit detailed execution event for tool execution progress
        console.log(`[ToolWrapper] Tool execution in progress: ${options.name || 'unknown'}`);
        
        // Execute the original tool with timeout
        const executePromise = originalTool.execute(args, context);
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Tool execution timed out after ${mergedExecutionOptions.timeout}ms`));
          }, mergedExecutionOptions.timeout);
        });
        
        // Race the execution against the timeout
        const result = await Promise.race([executePromise, timeoutPromise]);
        
        // Update the step info
        stepInfo.endTime = new Date();
        stepInfo.status = ToolStatus.COMPLETED;
        
        // Calculate step duration
        const stepDuration = Date.now() - executionStartTime;
        metrics.stepDurations[stepInfo.toolName] = stepDuration;
        
        // Update the tool call status to completed
        await toolManager.updateToolCallStatus(
          toolCall.id,
          ToolStatus.COMPLETED,
          result
        );
        
        // Cache the results
        await cacheToolResults(cacheKey, result);
        
        // Call the onStepFinish callback if provided
        if (mergedExecutionOptions.onStepFinish) {
          mergedExecutionOptions.onStepFinish(stepInfo, result);
        }
        
        // Emit detailed execution event for tool execution completion
        console.log(`[ToolWrapper] Tool execution completed: ${options.name || 'unknown'}`);
        
        // Update metrics
        metrics.endTime = new Date();
        metrics.totalDuration = Date.now() - executionStartTime;
        metrics.successRate = 1.0; // 100% success
        
        // Call the onComplete callback if provided
        if (mergedExecutionOptions.onComplete) {
          mergedExecutionOptions.onComplete([result], metrics);
        }
        
        return result;
      } catch (error) {
        // Check if this is an approval required error
        if (error instanceof Error && error.message === 'APPROVAL_REQUIRED') {
          // This is not a real error, just a signal that approval is required
          // Return a special value to indicate approval is required
          return {
            status: 'awaiting_approval',
            toolCallId,
            message: 'Tool execution requires approval'
          };
        }
        
        // Update the step info
        stepInfo.endTime = new Date();
        stepInfo.status = ToolStatus.FAILED;
        
        // Get the tool call
        const toolCall = await getCachedToolCall(toolCallId);
        
        if (toolCall) {
          // Update the tool call status to failed
          await toolManager.updateToolCallStatus(
            toolCall.id,
            ToolStatus.FAILED,
            null,
            error instanceof Error ? error.message : String(error)
          );
        }
        
        // Call the onError callback if provided
        if (mergedExecutionOptions.onError) {
          mergedExecutionOptions.onError(
            error instanceof Error ? error : new Error(String(error)),
            stepInfo
          );
        }
        
        // Emit detailed execution event for tool execution failure
        console.log(`[ToolWrapper] Tool execution failed: ${options.name || 'unknown'}`);
        console.error(`[ToolWrapper] Error details:`, error);
        
        // Update metrics
        metrics.endTime = new Date();
        metrics.totalDuration = Date.now() - executionStartTime;
        metrics.successRate = 0.0; // 0% success
        
        // Re-throw the error
        throw error;
      }
    }
  };
  
  return wrappedTool;
}

/**
 * Create a multi-step tool pipeline
 * 
 * @param tools - Array of tools to execute in sequence
 * @param options - Execution options
 * @returns A function that executes the tools in sequence
 */
export function createToolPipeline(
  tools: any[],
  options: Partial<ToolExecutionOptions> = {}
) {
  // Merge default options with provided options
  const mergedOptions = {
    ...DEFAULT_EXECUTION_OPTIONS,
    ...options,
  };
  
  // Return a function that executes the tools in sequence
  return async (args: any, context: any) => {
    // Generate a pipeline ID if not provided
    const pipelineId = (context && context.pipelineId) || generateUUID();
    
    // Extract chat ID from context
    const chatId = (context && context.chatId) || 'unknown';
    const messageId = (context && context.messageId) || 'unknown';
    
    // Create a pipeline record
    const pipeline = await toolManager.createToolPipeline({
      chatId,
      name: context?.pipelineName || 'Tool Pipeline',
      totalSteps: tools.length,
      metadata: {
        tools: tools.map(t => t.name || 'unknown'),
        args,
      }
    });
    
    // Store metrics
    const pipelineMetrics: ToolExecutionMetrics = {
      totalDuration: 0,
      stepDurations: {},
      startTime: new Date(),
      endTime: new Date(),
      successRate: 0,
      retryCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
    
    // Store results from each step
    const results: any[] = [];
    
    // Execute each tool in sequence
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      const stepNumber = i + 1;
      
      // Create a step context
      const stepContext = {
        ...context,
        pipelineId: pipeline.id,
        stepNumber,
        toolCallId: generateUUID(),
        chatId,
        messageId,
      };
      
      try {
        // Log step execution
        console.log(`[ToolPipeline] Executing step ${stepNumber}/${tools.length}: ${tool.name || 'unknown'}`);
        
        // Execute the tool
        const result = await tool.execute(args, stepContext);
        
        // Log step completion
        console.log(`[ToolPipeline] Step ${stepNumber}/${tools.length} completed: ${tool.name || 'unknown'}`);
        
        // Store the result
        results.push(result);
        
        // Update args for the next tool if needed
        if (typeof tool.updateArgs === 'function') {
          args = tool.updateArgs(args, result);
        }
      } catch (error) {
        // Log step failure
        console.error(`[ToolPipeline] Step ${stepNumber}/${tools.length} failed: ${tool.name || 'unknown'}`);
        console.error(`[ToolPipeline] Error details:`, error);
        
        // Update the pipeline status to failed
        await toolManager.updateToolPipelineStatus(
          pipeline.id,
          ToolStatus.FAILED,
          stepNumber,
          {
            error: error instanceof Error ? error.message : String(error),
            completedSteps: i,
          }
        );
        
        // Update metrics
        pipelineMetrics.endTime = new Date();
        pipelineMetrics.totalDuration = Date.now() - pipelineMetrics.startTime.getTime();
        pipelineMetrics.successRate = i / tools.length;
        
        // Re-throw the error
        throw error;
      }
    }
    
    // Log pipeline completion
    console.log(`[ToolPipeline] Pipeline completed successfully: ${context?.pipelineName || 'Tool Pipeline'}`);
    
    // Update the pipeline status to completed
    await toolManager.updateToolPipelineStatus(
      pipeline.id,
      ToolStatus.COMPLETED,
      tools.length,
      {
        completedSteps: tools.length,
      }
    );
    
    // Update metrics
    pipelineMetrics.endTime = new Date();
    pipelineMetrics.totalDuration = Date.now() - pipelineMetrics.startTime.getTime();
    pipelineMetrics.successRate = 1.0; // 100% success
    
    // Call the onComplete callback if provided
    if (mergedOptions.onComplete) {
      mergedOptions.onComplete(results, pipelineMetrics);
    }
    
    // Return the results
    return results;
  };
}