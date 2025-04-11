/**
 * Tool Approval Inline Component
 * 
 * This component displays an inline UI for approving or rejecting tool executions
 * within the multimodal input component. It's designed to be embedded in the
 * input area rather than as a separate card.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, AlertTriangle } from 'lucide-react';
import { ToolCall } from '@/lib/db/schema-tool-state';
import { useToolApproval } from '@/hooks/use-tool-approval';
import { APPROVAL } from '@/lib/tools/hitl-client';

interface ToolApprovalInlineProps {
  toolCall: ToolCall;
  onComplete?: () => void;
}

export function ToolApprovalInline({
  toolCall,
  onComplete
}: ToolApprovalInlineProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use the tool approval hook
  const { approveToolExecution, rejectToolExecution } = useToolApproval({
    onApproved: () => onComplete?.(),
    onRejected: () => onComplete?.()
  });

  // Handle approve button click
  const handleApprove = async () => {
    try {
      setIsApproving(true);
      setError(null);
      await approveToolExecution(toolCall.id);
    } catch (err) {
      setError(`Failed to approve: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsApproving(false);
    }
  };

  // Handle reject button click
  const handleReject = async () => {
    try {
      setIsRejecting(true);
      setError(null);
      await rejectToolExecution(toolCall.id);
    } catch (err) {
      setError(`Failed to reject: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRejecting(false);
    }
  };

  // Format arguments for display
  const formatArgs = (args: any) => {
    if (!args) return 'No arguments';
    
    try {
      if (typeof args === 'string') {
        return args;
      }
      return JSON.stringify(args, null, 2);
    } catch (e) {
      return String(args);
    }
  };

  return (
    <div className="p-2 border border-yellow-300 dark:border-yellow-700 rounded-md bg-yellow-50 dark:bg-yellow-950/30 mb-2">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <AlertTriangle className="mr-2 size-4 text-yellow-500" />
            <span className="text-sm font-medium">Tool Approval Required</span>
          </div>
          <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            PENDING
          </Badge>
        </div>
        
        <div className="space-y-1 text-sm">
          <div className="flex items-center">
            <span className="font-medium mr-1">Tool:</span>
            <span>{toolCall.toolName}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="font-medium">Arguments:</span>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded mt-1 overflow-x-auto max-h-20">
              {formatArgs(toolCall.args)}
            </pre>
          </div>
        </div>
        
        {error && (
          <div className="text-xs text-red-500">
            {error}
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
            onClick={handleReject}
            disabled={isApproving || isRejecting}
          >
            <X className="mr-1 size-3" />
            Reject
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950"
            onClick={handleApprove}
            disabled={isApproving || isRejecting}
          >
            <Check className="mr-1 size-3" />
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}