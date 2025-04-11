/**
 * Tool Approval Hook
 * 
 * This hook provides client-side functionality for approving or rejecting tool executions.
 * It allows components to:
 * - Fetch pending tool approvals
 * - Approve or reject tool executions
 * - Track the status of approval requests
 */

import { useState, useCallback } from 'react';
import { ToolCall, ToolStatus } from '@/lib/db/schema-tool-state';
import { toast } from 'sonner';
import { approveToolCall, rejectToolCall } from '@/lib/tools/hitl-client';

interface UseToolApprovalOptions {
  onApproved?: (toolCallId: string) => void;
  onRejected?: (toolCallId: string) => void;
}

/**
 * Hook for managing tool approvals
 * 
 * @param options - Hook options
 * @returns Tool approval state and helper functions
 */
export function useToolApproval(options: UseToolApprovalOptions = {}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Approve a tool execution
  const approveToolExecution = useCallback(async (toolCallId: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Use the utility function to approve the tool call
      const updatedToolCall = await approveToolCall(toolCallId);
      
      if (!updatedToolCall) {
        throw new Error('Failed to approve tool execution');
      }
      
      // Call the onApproved callback if provided
      if (options.onApproved) {
        options.onApproved(toolCallId);
      }
      
      toast.success('Tool execution approved');
      
      return updatedToolCall;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      toast.error(`Error approving tool: ${errorMessage}`);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [options]);
  
  // Reject a tool execution
  const rejectToolExecution = useCallback(async (toolCallId: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Use the utility function to reject the tool call
      const updatedToolCall = await rejectToolCall(toolCallId);
      
      if (!updatedToolCall) {
        throw new Error('Failed to reject tool execution');
      }
      
      // Call the onRejected callback if provided
      if (options.onRejected) {
        options.onRejected(toolCallId);
      }
      
      toast.success('Tool execution rejected');
      
      return updatedToolCall;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      toast.error(`Error rejecting tool: ${errorMessage}`);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [options]);
  
  // Check if a tool call requires approval
  const requiresApproval = useCallback((toolCall: ToolCall | null | undefined) => {
    return toolCall?.status === ToolStatus.AWAITING_APPROVAL;
  }, []);
  
  return {
    isProcessing,
    error,
    approveToolExecution,
    rejectToolExecution,
    requiresApproval,
  };
}