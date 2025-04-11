/**
 * MCP Events Hook
 * 
 * This hook provides a real-time connection to MCP server events using Server-Sent Events (SSE).
 * It allows components to:
 * - Receive real-time updates when MCP servers connect or disconnect
 * - Get notified when MCP tools are executed
 * - Get notified when MCP resources are accessed
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MCPServer } from './use-mcp-tools';

// Event types
export type MCPEventType = 
  | 'connected'
  | 'servers-updated'
  | 'tool-executed'
  | 'resource-accessed'
  | 'heartbeat';

// Event data structure
export interface MCPEvent {
  type: string;
  servers?: MCPServer[];
  data?: any;
  message?: string;
  timestamp?: number;
}

// Connection status
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Hook options
interface UseMCPEventsOptions {
  onServersUpdated?: (servers: MCPServer[]) => void;
  onToolExecuted?: (data: any) => void;
  onResourceAccessed?: (data: any) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

/**
 * Hook for subscribing to MCP events
 * 
 * @param options - Hook options
 * @returns MCP events state and helper functions
 */
export function useMCPEvents({
  onServersUpdated,
  onToolExecuted,
  onResourceAccessed,
  onError,
  enabled = true
}: UseMCPEventsOptions = {}) {
  // Track connection status
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  
  // Store the latest events
  const [events, setEvents] = useState<MCPEvent[]>([]);
  
  // Store the latest servers
  const [servers, setServers] = useState<MCPServer[]>([]);
  
  // Track the event source instance
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Track reconnection attempts
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Connect to the SSE endpoint
  const connect = useCallback(() => {
    if (!enabled || typeof window === 'undefined') {
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
      const eventSource = new EventSource('/api/tools/mcp/events');
      eventSourceRef.current = eventSource;
      
      // Handle connection open
      eventSource.onopen = () => {
        setStatus('connected');
        reconnectAttempts.current = 0;
        console.log('[MCPEvents] Connected to MCP events');
      };
      
      // Handle specific event types
      eventSource.addEventListener('connected', (event) => {
        try {
          const data = JSON.parse(event.data);
          setEvents((prev) => [...prev, { type: 'connected', ...data }]);
          
          if (data.servers) {
            setServers(data.servers);
            onServersUpdated?.(data.servers);
          }
        } catch (error) {
          console.error('[MCPEvents] Error parsing connected event:', error);
        }
      });
      
      eventSource.addEventListener('servers-updated', (event) => {
        try {
          const data = JSON.parse(event.data);
          setEvents((prev) => [...prev, { type: 'servers-updated', ...data }]);
          
          if (data.servers) {
            setServers(data.servers);
            onServersUpdated?.(data.servers);
          }
        } catch (error) {
          console.error('[MCPEvents] Error parsing servers-updated event:', error);
        }
      });
      
      eventSource.addEventListener('tool-executed', (event) => {
        try {
          const data = JSON.parse(event.data);
          setEvents((prev) => [...prev, { type: 'tool-executed', ...data }]);
          onToolExecuted?.(data);
        } catch (error) {
          console.error('[MCPEvents] Error parsing tool-executed event:', error);
        }
      });
      
      eventSource.addEventListener('resource-accessed', (event) => {
        try {
          const data = JSON.parse(event.data);
          setEvents((prev) => [...prev, { type: 'resource-accessed', ...data }]);
          onResourceAccessed?.(data);
        } catch (error) {
          console.error('[MCPEvents] Error parsing resource-accessed event:', error);
        }
      });
      
      eventSource.addEventListener('heartbeat', (event) => {
        try {
          const data = JSON.parse(event.data);
          // Don't add heartbeats to the events array to avoid cluttering it
          // Just use it to confirm the connection is still alive
        } catch (error) {
          console.error('[MCPEvents] Error parsing heartbeat event:', error);
        }
      });
      
      // Handle errors
      eventSource.onerror = (error) => {
        console.error(`[MCPEvents] Error with SSE connection:`, error);
        
        // Close the connection on error
        eventSource.close();
        eventSourceRef.current = null;
        
        // Update status
        setStatus('error');
        
        // Try to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
          reconnectAttempts.current++;
          
          console.log(`[MCPEvents] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          setTimeout(connect, delay);
        } else {
          console.error(`[MCPEvents] Max reconnect attempts reached`);
          onError?.(new Error('Failed to connect to MCP events after multiple attempts'));
        }
      };
    } catch (error) {
      console.error('[MCPEvents] Error creating SSE connection:', error);
      setStatus('error');
      onError?.(error instanceof Error ? error : new Error('Unknown error creating SSE connection'));
    }
  }, [enabled, onServersUpdated, onToolExecuted, onResourceAccessed, onError]);
  
  // Disconnect from the SSE endpoint
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setStatus('disconnected');
      console.log('[MCPEvents] Disconnected from MCP events');
    }
  }, []);
  
  // Connect when the component mounts
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }
    
    // Clean up on unmount
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);
  
  return {
    status,
    events,
    servers,
    connect,
    disconnect,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isDisconnected: status === 'disconnected',
    isError: status === 'error',
  };
}