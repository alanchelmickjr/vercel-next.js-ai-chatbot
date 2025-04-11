/**
 * Human-in-the-Loop (HITL) Client Utilities
 * 
 * This module provides client-side utilities for implementing human-in-the-loop functionality
 * for tool execution. It uses API calls instead of direct database access.
 */

import { ToolCall, ToolStatus } from '@/lib/db/schema-tool-state';

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
 * Approve a tool call via API
 * 
 * @param toolCallId - The ID of the tool call
 * @returns The updated tool call
 */
export async function approveToolCall(toolCallId: string): Promise<ToolCall> {
  const response = await fetch('/api/tools/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      toolCallId,
      status: ToolStatus.PROCESSING,
      action: 'approve',
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to approve tool execution');
  }
  
  return await response.json();
}

/**
 * Reject a tool call via API
 * 
 * @param toolCallId - The ID of the tool call
 * @returns The updated tool call
 */
export async function rejectToolCall(toolCallId: string): Promise<ToolCall> {
  const response = await fetch('/api/tools/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      toolCallId,
      status: ToolStatus.REJECTED,
      action: 'reject',
      error: 'Tool execution rejected by user'
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to reject tool execution');
  }
  
  return await response.json();
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