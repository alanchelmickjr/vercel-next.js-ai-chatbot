/**
 * Tool Events Hook
 * 
 * This hook provides a real-time connection to tool state events using Server-Sent Events (SSE).
 * It allows components to:
 * - Receive real-time updates when tool states change
 * - Track tool call and pipeline status without polling
 * - Get notified of new tool calls and pipelines
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ToolCall, ToolPipeline } from '@/lib/db/schema-tool-state';

// Event types
export type ToolEventType =
  | 'connected'
  | 'tool-call-updated'
  | 'tool-pipeline-updated'
  | 'chat-tools-updated'
  | 'heartbeat'
  | 'tool-approval-required'
  | 'tool-approved'
  | 'tool-rejected';

// Event data structure
export interface ToolEvent {
  type: string;
  data?: any;
  chatId?: string;
  message?: string;
  timestamp?: number;
}

// Connection status
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Hook options
interface UseToolEventsOptions {
  chatId: string | null;
  onToolCallUpdated?: (toolCall: ToolCall) => void;
  onToolPipelineUpdated?: (pipeline: ToolPipeline) => void;
  onChatToolsUpdated?: (update: { type: string, id: string }) => void;
  onToolApprovalRequired?: (toolCall: ToolCall) => void;
  onToolApproved?: (toolCall: ToolCall) => void;
  onToolRejected?: (toolCall: ToolCall) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

/**
 * Hook for subscribing to tool events
 * 
 * @param options - Hook options
 * @returns Tool events state and helper functions
 */
export function useToolEvents({
  chatId,
  onToolCallUpdated,
  onToolPipelineUpdated,
  onChatToolsUpdated,
  onToolApprovalRequired,
  onToolApproved,
  onToolRejected,
  onError,
  enabled = true
}: UseToolEventsOptions) {
  // Track connection status
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  
  // Store the latest events
  const [events, setEvents] = useState<ToolEvent[]>([]);
  
  // Track the event source instance
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Track reconnection attempts
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Connect to the SSE endpoint
  const connect = useCallback(() => {
    if (!chatId || !enabled || typeof window === 'undefined') {
      return;
    }
    
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    try {
      setStatus('connecting');
      
      // Create a new EventSource connection
      const eventSource = new EventSource(`/api/tools/events?chatId=${chatId}`);
      eventSourceRef.current = eventSource;
      
      // Handle connection open
      eventSource.onopen = () => {
        setStatus('connected');
        reconnectAttempts.current = 0;
      };
      
      // Handle specific event types
      eventSource.addEventListener('connected', (event) => {
        try {
          const data = JSON.parse(event.data);
          setEvents((prev) => [...prev, { type: 'connected', ...data }]);
        } catch (error) {
          // Ignore parsing errors
        }
      });
      
      eventSource.addEventListener('tool-call-updated', (event) => {
        try {
          const data = JSON.parse(event.data);
          setEvents((prev) => [...prev, { type: 'tool-call-updated', ...data }]);
          
          if (data.toolCalls) {
            // Handle initial data with multiple tool calls
            data.toolCalls.forEach((toolCall: ToolCall) => {
              onToolCallUpdated?.(toolCall);
              
              // Check if this tool call requires approval
              if (toolCall.status === 'awaiting_approval') {
                onToolApprovalRequired?.(toolCall);
              }
            });
          } else if (data.toolCall) {
            // Handle single tool call update
            onToolCallUpdated?.(data.toolCall);
            
            // Check if this tool call requires approval
            if (data.toolCall.status === 'awaiting_approval') {
              onToolApprovalRequired?.(data.toolCall);
            } else if (data.toolCall.status === 'completed' && data.previousStatus === 'awaiting_approval') {
              onToolApproved?.(data.toolCall);
            } else if (data.toolCall.status === 'rejected') {
              onToolRejected?.(data.toolCall);
            }
          }
        } catch (error) {
          // Ignore parsing errors
        }
      });
      
      // Handle tool approval events
      eventSource.addEventListener('tool-approval-required', (event) => {
        try {
          const data = JSON.parse(event.data);
          setEvents((prev) => [...prev, { type: 'tool-approval-required', ...data }]);
          
          if (data.toolCall) {
            onToolApprovalRequired?.(data.toolCall);
          }
        } catch (error) {
          // Ignore parsing errors
        }
      });
      
      eventSource.addEventListener('tool-approved', (event) => {
        try {
          const data = JSON.parse(event.data);
          setEvents((prev) => [...prev, { type: 'tool-approved', ...data }]);
          
          if (data.toolCall) {
            onToolApproved?.(data.toolCall);
          }
        } catch (error) {
          // Ignore parsing errors
        }
      });
      
      eventSource.addEventListener('tool-rejected', (event) => {
        try {
          const data = JSON.parse(event.data);
          setEvents((prev) => [...prev, { type: 'tool-rejected', ...data }]);
          
          if (data.toolCall) {
            onToolRejected?.(data.toolCall);
          }
        } catch (error) {
          // Ignore parsing errors
        }
      });
      
      eventSource.addEventListener('tool-pipeline-updated', (event) => {
        try {
          const data = JSON.parse(event.data);
          setEvents((prev) => [...prev, { type: 'tool-pipeline-updated', ...data }]);
          
          if (data.pipelines) {
            // Handle initial data with multiple pipelines
            data.pipelines.forEach((pipeline: ToolPipeline) => {
              onToolPipelineUpdated?.(pipeline);
            });
          } else if (data.pipeline) {
            // Handle single pipeline update
            onToolPipelineUpdated?.(data.pipeline);
          }
        } catch (error) {
          // Ignore parsing errors
        }
      });
      
      eventSource.addEventListener('chat-tools-updated', (event) => {
        try {
          const data = JSON.parse(event.data);
          setEvents((prev) => [...prev, { type: 'chat-tools-updated', ...data }]);
          
          // Notify about chat tools updates
          if (data.update) {
            onChatToolsUpdated?.(data.update);
          }
        } catch (error) {
          // Ignore parsing errors
        }
      });
      
      eventSource.addEventListener('heartbeat', (event) => {
        try {
          const data = JSON.parse(event.data);
          // Don't add heartbeats to the events array to avoid cluttering it
          // Just use it to confirm the connection is still alive
        } catch (error) {
          // Ignore parsing errors
        }
      });
      
      // Handle errors
      eventSource.onerror = (error) => {
        
        // Close the connection on error
        eventSource.close();
        eventSourceRef.current = null;
        
        // Update status
        setStatus('error');
        
        // Try to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
          reconnectAttempts.current++;
          
          setTimeout(connect, delay);
        } else {
          onError?.(new Error('Failed to connect to tool events after multiple attempts'));
        }
      };
    } catch (error) {
      setStatus('error');
      onError?.(error instanceof Error ? error : new Error('Unknown error creating SSE connection'));
    }
  }, [chatId, enabled, onToolCallUpdated, onToolPipelineUpdated, onChatToolsUpdated, onToolApprovalRequired, onToolApproved, onToolRejected, onError]);
  
  // Disconnect from the SSE endpoint
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setStatus('disconnected');
    }
  }, [chatId]);
  
  // Connect when the component mounts or chatId changes
  useEffect(() => {
    if (chatId && enabled) {
      connect();
    } else {
      disconnect();
    }
    
    // Clean up on unmount
    return () => {
      disconnect();
    };
  }, [chatId, enabled, connect, disconnect]);
  
  return {
    status,
    events,
    connect,
    disconnect,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isDisconnected: status === 'disconnected',
    isError: status === 'error',
  };
}