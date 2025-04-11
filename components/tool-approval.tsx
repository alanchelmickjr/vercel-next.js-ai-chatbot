/**
 * Tool Approval Component
 * 
 * This component displays a UI for approving or rejecting tool executions.
 * It shows:
 * - Tool name and description
 * - Arguments being passed to the tool
 * - Approve and Reject buttons
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import { ToolCall } from '@/lib/db/schema-tool-state';

interface ToolApprovalProps {
  toolCall: ToolCall;
  onApprove: (toolCallId: string) => Promise<void>;
  onReject: (toolCallId: string) => Promise<void>;
}

export function ToolApproval({ toolCall, onApprove, onReject }: ToolApprovalProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle approve button click
  const handleApprove = async () => {
    try {
      setIsApproving(true);
      setError(null);
      await onApprove(toolCall.id);
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
      await onReject(toolCall.id);
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
    <Card className="p-4 w-full border-yellow-300 dark:border-yellow-700 shadow-md">
      <div className="flex flex-col space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <AlertTriangle className="mr-2 size-5 text-yellow-500" />
            <h3 className="text-sm font-medium">Tool Approval Required</h3>
          </div>
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            PENDING APPROVAL
          </Badge>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2">Tool:</span>
            <span className="text-sm">{toolCall.toolName}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm font-medium">Arguments:</span>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
              {formatArgs(toolCall.args)}
            </pre>
          </div>
        </div>
        
        {error && (
          <div className="text-sm text-red-500 flex items-center">
            <Info className="mr-1 size-4" />
            {error}
          </div>
        )}
        
        <div className="flex justify-end space-x-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
            onClick={handleReject}
            disabled={isApproving || isRejecting}
          >
            <X className="mr-1 size-4" />
            Reject
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950"
            onClick={handleApprove}
            disabled={isApproving || isRejecting}
          >
            <Check className="mr-1 size-4" />
            Approve
          </Button>
        </div>
      </div>
    </Card>
  );
}