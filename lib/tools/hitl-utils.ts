/**
 * Human-in-the-Loop (HITL) Utilities
 * 
 * This module provides utilities for implementing human-in-the-loop functionality
 * for tool execution. It allows users to approve or reject tool executions before
 * they are performed.
 */

import { ToolCall, ToolStatus } from '@/lib/db/schema-tool-state';
import { toolManager } from './tool-manager';

// Approval constants to be shared across the application
export const APPROVAL = {
  YES: 'approved',
  NO: 'rejected',
} as const;

export type ApprovalStatus = typeof APPROVAL[keyof typeof APPROVAL] | null;

/**
 * Check if a tool requires approval
 * 
 * @param toolName - The name of the tool
 * @param requireApprovalList - List of tools that require approval
 * @returns Whether the tool requires approval
 */
export function toolRequiresApproval(
  toolName: string,
  requireApprovalList: string[] = []
): boolean {
  return requireApprovalList.includes(toolName);
}

/**
 * Set a tool call to awaiting approval
 * 
 * @param toolCallId - The ID of the tool call
 * @returns The updated tool call
 */
export async function setToolCallAwaitingApproval(
  toolCallId: string
): Promise<ToolCall | undefined> {
  return await toolManager.updateToolCallStatus(
    toolCallId,
    ToolStatus.AWAITING_APPROVAL
  );
}

/**
 * Approve a tool call
 * 
 * @param toolCallId - The ID of the tool call
 * @returns The updated tool call
 */
export async function approveToolCall(
  toolCallId: string
): Promise<ToolCall | undefined> {
  // First set to processing
  const toolCall = await toolManager.updateToolCallStatus(
    toolCallId,
    ToolStatus.PROCESSING
  );
  
  // Then execute the tool (this would be handled by the tool execution API)
  // For now, we'll just return the updated tool call
  return toolCall;
}

/**
 * Reject a tool call
 * 
 * @param toolCallId - The ID of the tool call
 * @returns The updated tool call
 */
export async function rejectToolCall(
  toolCallId: string
): Promise<ToolCall | undefined> {
  return await toolManager.updateToolCallStatus(
    toolCallId,
    ToolStatus.REJECTED,
    null,
    'Tool execution rejected by user'
  );
}

/**
 * Get all tools that require approval
 * 
 * @param tools - Map of tool names to tool options
 * @returns Array of tool names that require approval
 */
export function getToolsRequiringApproval(tools: Record<string, any>): string[] {
  return Object.entries(tools)
    .filter(([_, tool]) => tool.requireApproval === true)
    .map(([name]) => name);
}

/**
 * Process tool calls that require approval
 * 
 * @param toolCalls - Array of tool calls to process
 * @param requireApprovalList - List of tools that require approval
 * @returns Array of tool calls that require approval
 */
export function getToolCallsRequiringApproval(
  toolCalls: ToolCall[],
  requireApprovalList: string[] = []
): ToolCall[] {
  return toolCalls.filter(
    (call) => 
      call.status === ToolStatus.AWAITING_APPROVAL && 
      toolRequiresApproval(call.toolName, requireApprovalList)
  );
}