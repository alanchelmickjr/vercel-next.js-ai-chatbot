/**
 * MCP Tools Hook
 * 
 * This hook provides client-side access to MCP servers, tools, and resources.
 * It allows components to:
 * - List connected MCP servers
 * - Execute MCP tools
 * - Access MCP resources
 * - Track execution status
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useToolCall } from './use-tool-state';
import { useMCPEvents } from './use-mcp-events';
import { generateUUID } from '@/lib/utils';

// Types for MCP entities
export interface MCPServer {
  name: string;
  description: string;
  version: string;
  tools: MCPTool[];
  resources: MCPResource[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  outputSchema: any;
}

export interface MCPResource {
  uri: string;
  description: string;
}

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch MCP data');
  }
  return res.json();
};

/**
 * Hook for accessing MCP servers and tools
 * 
 * @returns MCP servers and tools with execution functions
 */
export function useMCPTools() {
  const [executingTools, setExecutingTools] = useState<Record<string, string>>({});
  
  // Use SWR for initial data fetch
  const { data: initialData, error, mutate } = useSWR('/api/tools/mcp', fetcher, {
    // Reduced polling interval since we'll get real-time updates
    refreshInterval: 0, // Disable polling
    revalidateOnFocus: true,
  });
  
  // Store the servers state locally
  const [servers, setServers] = useState<MCPServer[]>(initialData?.servers || []);
  
  // Track if we've received the initial data
  const initialDataReceived = useRef(false);
  
  // Update local state when SWR data changes
  useEffect(() => {
    if (initialData?.servers) {
      setServers(initialData.servers);
      initialDataReceived.current = true;
    }
  }, [initialData]);
  
  // Subscribe to MCP events
  const { isConnected } = useMCPEvents({
    onServersUpdated: (updatedServers) => {
      setServers(updatedServers);
      // Also update the SWR cache
      mutate({ servers: updatedServers }, false);
    },
    // Only enable events after we've received initial data
    enabled: initialDataReceived.current,
  });
  
  // Track tool call status for executing tools
  const toolCallStatuses = Object.entries(executingTools).map(([key, toolCallId]) => {
    const { toolCall, isCompleted, isFailed, isProcessing, isPending } = useToolCall(toolCallId);
    return {
      key,
      toolCallId,
      toolCall,
      isCompleted,
      isFailed,
      isProcessing,
      isPending,
    };
  });
  
  // Execute an MCP tool
  const executeTool = useCallback(async (
    serverName: string,
    toolName: string,
    args: any,
    context: any = {}
  ) => {
    try {
      // Generate a unique key for this execution
      const executionKey = `${serverName}:${toolName}:${Date.now()}`;
      
      // Generate a tool call ID
      const toolCallId = generateUUID();
      
      // Add to executing tools
      setExecutingTools(prev => ({
        ...prev,
        [executionKey]: toolCallId,
      }));
      
      // Execute the tool
      const response = await fetch('/api/tools/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'execute_tool',
          serverName,
          toolName,
          args,
          context: {
            ...context,
            toolCallId,
          },
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute MCP tool');
      }
      
      const data = await response.json();
      
      // Remove from executing tools after a delay
      // This allows the UI to show the completed status for a moment
      setTimeout(() => {
        setExecutingTools(prev => {
          const newState = { ...prev };
          delete newState[executionKey];
          return newState;
        });
      }, 5000);
      
      return data.result;
    } catch (error) {
      console.error('Error executing MCP tool:', error);
      throw error;
    }
  }, []);
  
  // Access an MCP resource
  const accessResource = useCallback(async (
    serverName: string,
    uri: string,
    context: any = {}
  ) => {
    try {
      // Execute the tool
      const response = await fetch('/api/tools/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'access_resource',
          serverName,
          uri,
          context,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to access MCP resource');
      }
      
      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Error accessing MCP resource:', error);
      throw error;
    }
  }, []);
  
  // Refresh the list of servers
  const refreshServers = useCallback(() => {
    mutate();
  }, [mutate]);
  
  return {
    servers,
    isLoading: !error && !initialData,
    error,
    executingTools: toolCallStatuses,
    executeTool,
    accessResource,
    refreshServers,
    isConnected,
  };
}

/**
 * Hook for using a specific MCP tool
 * 
 * @param serverName - The name of the MCP server
 * @param toolName - The name of the tool
 * @returns Tool execution function and status
 */
export function useMCPTool(serverName: string, toolName: string) {
  const { servers, executeTool, executingTools } = useMCPTools();
  
  // Find the server and tool
  const server = servers.find(s => s.name === serverName);
  const tool = server?.tools.find(t => t.name === toolName);
  
  // Find any executing instances of this tool
  const activeExecutions = executingTools.filter(
    status => status.toolCall?.toolName === `mcp:${serverName}:${toolName}`
  );
  
  // Check if the tool is currently executing
  const isExecuting = activeExecutions.some(
    status => status.isProcessing || status.isPending
  );
  
  // Execute the tool with the given arguments
  const execute = useCallback(async (args: any, context: any = {}) => {
    return executeTool(serverName, toolName, args, context);
  }, [serverName, toolName, executeTool]);
  
  return {
    server,
    tool,
    execute,
    isExecuting,
    activeExecutions,
  };
}

/**
 * Hook for accessing a specific MCP resource
 * 
 * @param serverName - The name of the MCP server
 * @param uri - The URI of the resource
 * @returns Resource access function and data
 */
export function useMCPResource(serverName: string, uri: string) {
  const { servers, accessResource } = useMCPTools();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Find the server and resource
  const server = servers.find(s => s.name === serverName);
  const resource = server?.resources.find(r => r.uri === uri);
  
  // Access the resource
  const access = useCallback(async (context: any = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await accessResource(serverName, uri, context);
      
      setData(result);
      setIsLoading(false);
      
      return result;
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
      setIsLoading(false);
      throw error;
    }
  }, [serverName, uri, accessResource]);
  
  return {
    server,
    resource,
    access,
    isLoading,
    data,
    error,
  };
}