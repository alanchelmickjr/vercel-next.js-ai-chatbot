'use client';

import { useState, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToolCall, useToolPipeline } from '@/hooks/use-tool-state';
import { ToolStatus } from '@/lib/db/schema-tool-state';
import {
  Clock, CheckCircle, XCircle, AlertCircle, RefreshCw,
  Zap, Database, BarChart, Timer, Cpu, Activity, Sparkles,
  Gauge, Rocket, Server, Layers
} from 'lucide-react';

interface ToolExecutionDisplayProps {
  toolCallId?: string;
  pipelineId?: string;
  showDetails?: boolean;
  showMetrics?: boolean;
}

// Helper function to get status color for borders and backgrounds
function getStatusColor(status: string): string {
  switch (status) {
    case ToolStatus.COMPLETED:
      return '#10b981'; // green-500
    case ToolStatus.FAILED:
      return '#ef4444'; // red-500
    case ToolStatus.PROCESSING:
      return '#3b82f6'; // blue-500
    case ToolStatus.PENDING:
      return '#f59e0b'; // amber-500
    default:
      return '#6b7280'; // gray-500
  }
}

// Helper function to safely get metric values
function getMetricValue(
  key: string,
  toolCallResult?: unknown,
  pipelineMetadata?: unknown
): number {
  // Check if toolCallResult has metrics
  if (
    toolCallResult &&
    typeof toolCallResult === 'object' &&
    toolCallResult !== null &&
    'metrics' in toolCallResult &&
    toolCallResult.metrics &&
    typeof toolCallResult.metrics === 'object' &&
    toolCallResult.metrics !== null &&
    key in toolCallResult.metrics
  ) {
    const value = (toolCallResult.metrics as any)[key];
    return typeof value === 'number' ? value : 0;
  }
  
  // Check if pipelineMetadata has metrics
  if (
    pipelineMetadata &&
    typeof pipelineMetadata === 'object' &&
    pipelineMetadata !== null &&
    'metrics' in pipelineMetadata &&
    pipelineMetadata.metrics &&
    typeof pipelineMetadata.metrics === 'object' &&
    pipelineMetadata.metrics !== null &&
    key in pipelineMetadata.metrics
  ) {
    const value = (pipelineMetadata.metrics as any)[key];
    return typeof value === 'number' ? value : 0;
  }
  
  return 0;
}

// Helper function to check if step durations exist
function hasStepDurations(
  toolCallResult?: unknown,
  pipelineMetadata?: unknown
): boolean {
  // Check if toolCallResult has step durations
  if (
    toolCallResult &&
    typeof toolCallResult === 'object' &&
    toolCallResult !== null &&
    'metrics' in toolCallResult &&
    toolCallResult.metrics &&
    typeof toolCallResult.metrics === 'object' &&
    toolCallResult.metrics !== null &&
    'stepDurations' in toolCallResult.metrics
  ) {
    return true;
  }
  
  // Check if pipelineMetadata has step durations
  if (
    pipelineMetadata &&
    typeof pipelineMetadata === 'object' &&
    pipelineMetadata !== null &&
    'metrics' in pipelineMetadata &&
    pipelineMetadata.metrics &&
    typeof pipelineMetadata.metrics === 'object' &&
    pipelineMetadata.metrics !== null &&
    'stepDurations' in pipelineMetadata.metrics
  ) {
    return true;
  }
  
  return false;
}

// Helper function to get step durations
function getStepDurations(
  toolCallResult?: unknown,
  pipelineMetadata?: unknown
): Record<string, number> {
  // Check if toolCallResult has step durations
  if (
    toolCallResult &&
    typeof toolCallResult === 'object' &&
    toolCallResult !== null &&
    'metrics' in toolCallResult &&
    toolCallResult.metrics &&
    typeof toolCallResult.metrics === 'object' &&
    toolCallResult.metrics !== null &&
    'stepDurations' in toolCallResult.metrics
  ) {
    return (toolCallResult.metrics as any).stepDurations as Record<string, number>;
  }
  
  // Check if pipelineMetadata has step durations
  if (
    pipelineMetadata &&
    typeof pipelineMetadata === 'object' &&
    pipelineMetadata !== null &&
    'metrics' in pipelineMetadata &&
    pipelineMetadata.metrics &&
    typeof pipelineMetadata.metrics === 'object' &&
    pipelineMetadata.metrics !== null &&
    'stepDurations' in pipelineMetadata.metrics
  ) {
    return (pipelineMetadata.metrics as any).stepDurations as Record<string, number>;
  }
  
  return {};
}

/**
 * Enhanced Tool Execution Display Component
 * 
 * This component provides a detailed visualization of tool execution,
 * including real-time status updates, progress tracking, and performance metrics.
 */
export function ToolExecutionDisplay({
  toolCallId,
  pipelineId,
  showDetails = true,
  showMetrics = true
}: ToolExecutionDisplayProps) {
  const [activeTab, setActiveTab] = useState('status');
  
  // If we have a pipeline ID, use the pipeline hook
  const {
    pipeline,
    toolCalls,
    isLoading: isPipelineLoading,
    isCompleted: isPipelineCompleted,
    isFailed: isPipelineFailed,
    isProcessing: isPipelineProcessing,
    isPending: isPipelinePending,
    progress,
    refreshPipeline
  } = useToolPipeline(pipelineId || null);
  
  // If we have a tool call ID, use the tool call hook
  const {
    toolCall,
    isLoading: isToolCallLoading,
    isCompleted: isToolCallCompleted,
    isFailed: isToolCallFailed,
    isProcessing: isToolCallProcessing,
    isPending: isToolCallPending,
    refreshToolCall
  } = useToolCall(toolCallId || null);
  
  // Determine if we're loading
  const isLoading = isPipelineLoading || isToolCallLoading;
  
  // Loading state
  if (isLoading) {
    return (
      <Card className="p-4 w-full">
        <div className="animate-pulse flex flex-col space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
          <div className="h-2 bg-gray-200 rounded w-3/4"></div>
        </div>
      </Card>
    );
  }
  
  // Not found state
  if (!pipeline && !toolCall) {
    return (
      <Card className="p-4 w-full">
        <div className="text-sm text-gray-500">
          Tool execution not found
        </div>
      </Card>
    );
  }
  
  // Determine status and name
  const status = pipeline?.status || toolCall?.status || 'unknown';
  const name = pipeline?.name || toolCall?.toolName || 'Tool Execution';
  
  // Format timestamps
  const startTime = pipeline?.createdAt || toolCall?.createdAt;
  const formattedStartTime = startTime ? new Date(startTime).toLocaleTimeString() : 'Unknown';
  
  const endTime = (isPipelineCompleted || isPipelineFailed || isToolCallCompleted || isToolCallFailed) 
    ? (pipeline?.updatedAt || toolCall?.updatedAt)
    : null;
  const formattedEndTime = endTime ? new Date(endTime).toLocaleTimeString() : 'In progress';
  
  // Calculate duration if completed
  let duration = 'In progress';
  if (endTime && startTime) {
    const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
    duration = `${(durationMs / 1000).toFixed(2)}s`;
  }
  
  // Get error message if failed
  let errorMessage = null;
  if (isPipelineFailed && pipeline?.metadata && typeof pipeline.metadata === 'object' && 'error' in pipeline.metadata) {
    errorMessage = String(pipeline.metadata.error);
  } else if (isToolCallFailed && toolCall?.error) {
    errorMessage = String(toolCall.error);
  }
  
  // Get result if completed
  const result = isToolCallCompleted ? toolCall?.result : null;
  
  // Render the component
  return (
    <Card className="w-full overflow-hidden border-2" style={{ borderColor: getStatusColor(status) }}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <StatusIcon status={status} />
            <h3 className="text-lg font-medium">{name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {(isToolCallProcessing || isPipelineProcessing) && (
              <button
                className="p-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-full transition-colors"
                onClick={() => {
                  // This would be connected to the tool manager to stop execution
                  console.log('Stop tool execution');
                  if (toolCallId) refreshToolCall();
                  if (pipelineId) refreshPipeline();
                }}
                title="Stop Execution"
              >
                <XCircle size={18} />
              </button>
            )}
            {(isToolCallFailed || isPipelineFailed) && (
              <button
                className="p-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition-colors"
                onClick={() => {
                  // This would be connected to the tool manager to retry execution
                  console.log('Retry tool execution');
                  if (toolCallId) refreshToolCall();
                  if (pipelineId) refreshPipeline();
                }}
                title="Retry Execution"
              >
                <RefreshCw size={18} />
              </button>
            )}
          </div>
        </div>
        
        {/* Progress bar for pipelines */}
        {pipelineId && (
          <div className="mb-4">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Step {pipeline?.currentStep || 0} of {pipeline?.totalSteps || 0}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}
        
        {/* Execution summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <Cpu size={16} className="text-gray-700" />
            <span>Execution Summary</span>
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock size={14} className="text-gray-500" />
                Start Time
              </span>
              <span className="text-sm font-medium">{formattedStartTime}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Timer size={14} className="text-gray-500" />
                End Time
              </span>
              <span className="text-sm font-medium">{formattedEndTime}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Activity size={14} className="text-gray-500" />
                Duration
              </span>
              <span className="text-sm font-medium">{duration}</span>
            </div>
          </div>
        </div>
        
        {/* Error message */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
            <div className="font-medium flex items-center gap-1 mb-1">
              <XCircle size={16} className="text-red-600" />
              <span>Error Detected:</span>
            </div>
            <div className="text-xs overflow-auto max-h-24 bg-white p-2 rounded border border-red-100">
              {errorMessage}
            </div>
          </div>
        )}
      </div>
      
      {/* Tabs for details, results, and metrics */}
      {showDetails && (
        <>
          <Separator />
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 pt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="status">Status</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                {showMetrics && <TabsTrigger value="metrics">Metrics</TabsTrigger>}
              </TabsList>
            </div>
            
            <TabsContent value="status" className="p-4 pt-2">
              {pipelineId && toolCalls && toolCalls.length > 0 ? (
                <div className="space-y-2">
                  {toolCalls.map((call) => (
                    <div key={call.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center space-x-2">
                        <StatusIcon status={call.status} size={16} />
                        <span>{call.toolName}</span>
                      </div>
                      <StatusBadge status={call.status} small />
                    </div>
                  ))}
                </div>
              ) : toolCall ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Status:</span>
                    <StatusBadge status={toolCall.status} />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Tool:</span>
                    <span>{toolCall.toolName}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">ID:</span>
                    <span className="text-xs text-gray-500">{toolCall.id}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No status information available</div>
              )}
            </TabsContent>
            
            <TabsContent value="details" className="p-4 pt-2">
              {toolCall ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Arguments:</h4>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-24">
                      {JSON.stringify(toolCall.args, null, 2)}
                    </pre>
                  </div>
                  
                  {result && typeof result === 'object' ? (
                    <div>
                      <h4 className="text-sm font-medium mb-1">
                        <span className="flex items-center gap-1">
                          <Sparkles size={16} className="text-blue-500" />
                          Result:
                        </span>
                      </h4>
                      <pre className="text-xs bg-blue-50 border border-blue-100 p-2 rounded overflow-auto max-h-24">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              ) : pipeline ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Pipeline:</span>
                    <span>{pipeline.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">ID:</span>
                    <span className="text-xs text-gray-500">{pipeline.id}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Steps:</span>
                    <span>{pipeline.currentStep} / {pipeline.totalSteps}</span>
                  </div>
                  
                  {pipeline.metadata && typeof pipeline.metadata === 'object' ? (
                    <div>
                      <h4 className="text-sm font-medium mb-1">
                        <span className="flex items-center gap-1">
                          <Database size={16} className="text-purple-500" />
                          Metadata:
                        </span>
                      </h4>
                      <pre className="text-xs bg-purple-50 border border-purple-100 p-2 rounded overflow-auto max-h-24">
                        {JSON.stringify(pipeline.metadata, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No details available</div>
              )}
            </TabsContent>
            
            {showMetrics && (
              <TabsContent value="metrics" className="p-4 pt-2">
                {(toolCall?.result && typeof toolCall.result === 'object' && 'metrics' in toolCall.result) ||
                  (pipeline?.metadata && typeof pipeline.metadata === 'object' && 'metrics' in pipeline.metadata) ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col p-2 bg-green-50 border border-green-100 rounded">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Database size={14} className="text-green-500" />
                          Cache Hits
                        </span>
                        <span className="text-sm font-medium text-green-700">
                          {getMetricValue('cacheHits', toolCall?.result, pipeline?.metadata)}
                        </span>
                      </div>
                      <div className="flex flex-col p-2 bg-amber-50 border border-amber-100 rounded">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Server size={14} className="text-amber-500" />
                          Cache Misses
                        </span>
                        <span className="text-sm font-medium text-amber-700">
                          {getMetricValue('cacheMisses', toolCall?.result, pipeline?.metadata)}
                        </span>
                      </div>
                      <div className="flex flex-col p-2 bg-blue-50 border border-blue-100 rounded">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Timer size={14} className="text-blue-500" />
                          Total Duration
                        </span>
                        <span className="text-sm font-medium text-blue-700">
                          {getMetricValue('totalDuration', toolCall?.result, pipeline?.metadata)}ms
                        </span>
                      </div>
                      <div className="flex flex-col p-2 bg-purple-50 border border-purple-100 rounded">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Activity size={14} className="text-purple-500" />
                          Success Rate
                        </span>
                        <span className="text-sm font-medium text-purple-700">
                          {(getMetricValue('successRate', toolCall?.result, pipeline?.metadata) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    
                    {hasStepDurations(toolCall?.result, pipeline?.metadata) && (
                      <div className="mt-4 border border-gray-200 rounded p-3 bg-gray-50">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <Layers size={16} className="text-indigo-500" />
                          <span>Step Durations:</span>
                        </h4>
                        <pre className="text-xs bg-white border border-gray-100 p-2 rounded overflow-auto max-h-24">
                          {JSON.stringify(
                            getStepDurations(toolCall?.result, pipeline?.metadata),
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No metrics available</div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </Card>
  );
}

// Helper component for status badges
function StatusBadge({ status, small = false }: { status: string, small?: boolean }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case ToolStatus.COMPLETED:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200';
      case ToolStatus.FAILED:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200';
      case ToolStatus.PROCESSING:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200';
      case ToolStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case ToolStatus.COMPLETED:
        return <CheckCircle size={small ? 12 : 14} className="mr-1" />;
      case ToolStatus.FAILED:
        return <XCircle size={small ? 12 : 14} className="mr-1" />;
      case ToolStatus.PROCESSING:
        return <RefreshCw size={small ? 12 : 14} className="mr-1 animate-spin" />;
      case ToolStatus.PENDING:
        return <Clock size={small ? 12 : 14} className="mr-1" />;
      default:
        return <AlertCircle size={small ? 12 : 14} className="mr-1" />;
    }
  };

  return (
    <Badge
      className={`${getStatusColor(status)} ${small ? 'text-xs px-2 py-0.5' : 'px-2.5 py-0.5'} flex items-center border`}
      variant="outline"
    >
      {getStatusIcon(status)}
      {status}
    </Badge>
  );
}

// Helper component for status icons
function StatusIcon({ status, size = 20 }: { status: string, size?: number }) {
  switch (status) {
    case ToolStatus.COMPLETED:
      return <CheckCircle size={size} className="text-green-500" />;
    case ToolStatus.FAILED:
      return <XCircle size={size} className="text-red-500" />;
    case ToolStatus.PROCESSING:
      return <RefreshCw size={size} className="text-blue-500 animate-spin" />;
    case ToolStatus.PENDING:
      return <Clock size={size} className="text-yellow-500" />;
    default:
      return <AlertCircle size={size} className="text-gray-500" />;
  }
}