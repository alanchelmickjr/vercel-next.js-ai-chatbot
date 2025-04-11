/**
 * Chat Tool Pipelines Component
 * 
 * This component displays active tool pipelines for a chat.
 * It shows:
 * - A list of active pipelines with their status
 * - Progress indicators for each pipeline
 * - Collapsible details for each pipeline
 */

'use client';

import { useState, useEffect } from 'react';
import { useChatToolPipelines } from '@/hooks/use-tool-state';
import { ToolPipelineDisplay } from '@/components/tool-pipeline-display';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react';

interface ChatToolPipelinesProps {
  chatId: string;
}

export function ChatToolPipelines({ chatId }: ChatToolPipelinesProps) {
  // Always call hooks at the top level
  const [isExpanded, setIsExpanded] = useState(true);
  const {
    pipelines,
    processingPipelines,
    pendingPipelines,
    isLoading,
    error
  } = useChatToolPipelines(chatId);

  // Auto-expand when tools are being used
  useEffect(() => {
    if (processingPipelines.length > 0 || pendingPipelines.length > 0) {
      setIsExpanded(true);
    }
  }, [processingPipelines.length, pendingPipelines.length]);

  // Always show the component during development, even when there are no active pipelines
  const activePipelines = [...processingPipelines, ...pendingPipelines];
  
  // For development, we'll always show the component
  // If there's an error with status 500, it likely means the chat doesn't exist yet
  if (error && 'status' in error && error.status === 500) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 mb-4">
      <Card className="p-2 bg-muted/50">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            {activePipelines.length > 0 && (
              <div className="flex items-center mr-2">
                <Settings2 size={16} className="mr-1 animate-pulse text-blue-500" />
                <span className="text-sm font-medium text-blue-500 animate-pulse">
                  Tools being used...
                </span>
              </div>
            )}
            <h3 className="text-sm font-medium">
              {activePipelines.length > 0 ? `(${activePipelines.length})` : "Active Tool Pipelines"}
            </h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="size-6 p-0" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>

        {isExpanded && (
          <div className="space-y-2">
            {isLoading ? (
              <div className="animate-pulse flex flex-col space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
                <div className="h-2 bg-gray-200 rounded w-3/4"></div>
              </div>
            ) : activePipelines.length === 0 ? (
              <div className="text-sm text-gray-500 italic">No active tools</div>
            ) : (
              activePipelines.map((pipeline) => (
                <ToolPipelineDisplay 
                  key={pipeline.id} 
                  pipelineId={pipeline.id} 
                  showDetails={false} 
                />
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
}