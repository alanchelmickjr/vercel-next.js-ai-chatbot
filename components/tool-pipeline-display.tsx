/**
 * Tool Pipeline Display Component
 * 
 * This component displays the progress of tool pipelines, showing:
 * - Current status (pending, processing, completed, failed)
 * - Progress bar for multi-step pipelines
 * - Individual tool call status within the pipeline
 * - Error messages for failed tool calls
 */

'use client';

import { useState, ReactNode, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToolPipeline } from '@/hooks/use-tool-state';
import { ToolStatus } from '@/lib/db/schema-tool-state';
import { cn } from '@/lib/utils';

interface ToolPipelineDisplayProps {
  pipelineId: string;
  showDetails?: boolean;
}

export function ToolPipelineDisplay({ 
  pipelineId, 
  showDetails = true 
}: ToolPipelineDisplayProps) {
  const { 
    pipeline, 
    toolCalls, 
    isLoading, 
    isCompleted, 
    isFailed, 
    isProcessing, 
    isPending, 
    progress, 
    error, 
    refreshPipeline 
  } = useToolPipeline(pipelineId);

  // Track loading state with animation
  const [showLoading, setShowLoading] = useState(isLoading);
  
  // Add a slight delay before showing/hiding loading state to prevent flashing
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      setShowLoading(true);
    } else {
      timeout = setTimeout(() => {
        setShowLoading(false);
      }, 300); // 300ms delay before hiding loading state
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);
  
  // Loading state
  if (showLoading && !pipeline) {
    return (
      <Card className="p-4 w-full transition-opacity duration-300">
        <div className="animate-pulse flex flex-col space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
          <div className="h-2 bg-gray-200 rounded w-3/4"></div>
        </div>
      </Card>
    );
  }

  // Not found state
  if (!pipeline) {
    return (
      <Card className="p-4 w-full">
        <div className="text-sm text-gray-500">
          Pipeline not found
        </div>
      </Card>
    );
  }

  // Extract values safely
  const name = typeof pipeline.name === 'string' ? pipeline.name : 'Pipeline';
  const status = typeof pipeline.status === 'string' ? pipeline.status : 'unknown';
  const currentStep = typeof pipeline.currentStep === 'number' ? pipeline.currentStep : 0;
  const totalSteps = typeof pipeline.totalSteps === 'number' ? pipeline.totalSteps : 0;
  
  // Check for error message
  let errorMessage: ReactNode = null;
  if (isFailed && pipeline.metadata && typeof pipeline.metadata === 'object' && 
      pipeline.metadata !== null && 'error' in pipeline.metadata) {
    const errorText = String(pipeline.metadata.error || 'Unknown error');
    errorMessage = (
      <div className="mt-2 text-sm text-red-500">
        Error: {errorText}
      </div>
    );
  }
  
  // Prepare tool calls list
  let toolCallsList: ReactNode = null;
  if (showDetails && toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
    toolCallsList = (
      <div className="mt-4">
        <Separator className="my-2" />
        <h4 className="text-xs font-medium mb-2">Pipeline Steps</h4>
        <div className="space-y-2">
          {toolCalls.map((call) => {
            const callId = typeof call.id === 'string' ? call.id : String(call.id);
            const stepNumber = typeof call.stepNumber === 'number' ? call.stepNumber : '?';
            const toolName = typeof call.toolName === 'string' ? call.toolName : 'Unknown tool';
            const callStatus = typeof call.status === 'string' ? call.status : 'unknown';
            
            return (
              <div key={callId} className="flex justify-between items-center text-xs">
                <div className="flex items-center">
                  <span className="mr-2">{stepNumber}.</span>
                  <span>{toolName}</span>
                </div>
                <StatusBadge status={callStatus} small />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Main render
  return (
    <Card className="p-4 w-full">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">{name}</h3>
          <StatusBadge status={status} />
        </div>
        
        {/* Progress bar */}
        <div className="w-full">
          <Progress
            value={progress}
            className={cn(
              "transition-all duration-500 ease-in-out",
              getProgressBarColor(status)
            )}
          />
        </div>
        
        {/* Step counter with animation */}
        <div className="text-xs text-gray-500 flex justify-between items-center">
          <span>Step {currentStep} of {totalSteps}</span>
          {isProcessing && (
            <span className="text-blue-500 animate-pulse">Processing...</span>
          )}
        </div>
        
        {/* Error message */}
        {errorMessage}
        
        {/* Tool calls */}
        {toolCallsList}
      </div>
    </Card>
  );
}

// Helper component for status badges
function StatusBadge({ status, small = false }: { status: string, small?: boolean }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case ToolStatus.COMPLETED:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case ToolStatus.FAILED:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case ToolStatus.PROCESSING:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case ToolStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Add animation for processing status
  const isProcessing = status === ToolStatus.PROCESSING;
  
  return (
    <Badge
      className={cn(
        getStatusColor(status),
        small ? 'text-xs px-2 py-0.5' : '',
        isProcessing ? 'animate-pulse' : '',
        'transition-all duration-300'
      )}
      variant="outline"
    >
      {status}
    </Badge>
  );
}

// Helper function for progress bar color
function getProgressBarColor(status: string) {
  switch (status) {
    case ToolStatus.COMPLETED:
      return 'bg-green-600 dark:bg-green-500';
    case ToolStatus.FAILED:
      return 'bg-red-600 dark:bg-red-500';
    case ToolStatus.PROCESSING:
      return 'bg-blue-600 dark:bg-blue-500';
    case ToolStatus.PENDING:
      return 'bg-yellow-600 dark:bg-yellow-500';
    default:
      return 'bg-gray-600 dark:bg-gray-500';
  }
}