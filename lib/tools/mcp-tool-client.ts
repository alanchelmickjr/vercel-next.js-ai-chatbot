/*
 * Created by Alan Helmick aka: crackerJack and Claude 3.7 via Roo
 * All rights applicable beyond open source reserved
 * Copyright Mira AI LLC 2025
 */

/**
 * MCP Tool Client
 * 
 * This module provides a client for interacting with MCP servers, tools, and resources.
 * It handles:
 * - Connecting to MCP servers
 * - Executing MCP tools
 * - Accessing MCP resources
 * - Publishing events for real-time updates
 * 
 * Usage:
 * ```typescript
 * // Connect to an MCP server
 * const server = connectMCPServer(myServer);
 * 
 * // Execute a tool
 * const result = await executeMCPTool('server-name', 'tool-name', { arg1: 'value' });
 * 
 * // Access a resource
 * const data = await accessMCPResource('server-name', 'resource-uri');
 * ```
 */

import { kv } from '@vercel/kv';
import { generateUUID } from '@/lib/utils';
import { toolManager } from '@/lib/tools/tool-manager';
import { ToolStatus } from '@/lib/db/schema-tool-state';

// Channel names for different event types
const MCP_EVENT_CHANNELS = {
  SERVER_UPDATED: 'mcp-server-updated',
  TOOL_EXECUTED: 'mcp-tool-executed',
  RESOURCE_ACCESSED: 'mcp-resource-accessed',
};

// Cache expiration times in seconds
const MCP_CACHE_EXPIRY = {
  EVENT: 60 * 5, // 5 minutes
};

// Types for MCP entities
export interface MCPServer {
  name: string;        // Unique identifier for the server
  description: string; // Human-readable description
  version: string;     // Server version
  tools: MCPTool[];    // Available tools on this server
  resources: MCPResource[]; // Available resources on this server
}

export interface MCPTool {
  name: string;        // Unique identifier for the tool
  description: string; // Human-readable description
  inputSchema: any;    // JSON Schema for tool inputs
  outputSchema: any;   // JSON Schema for tool outputs
}

export interface MCPResource {
  uri: string;         // Unique identifier for the resource
  description: string; // Human-readable description
}

// Store connected servers in memory for quick access
const connectedServers: Record<string, MCPServer> = {};

/**
 * Publish an MCP event
 * 
 * Stores event data in Redis for SSE endpoints to retrieve.
 * Uses a list structure to maintain event history and sets expiry
 * to prevent unlimited growth.
 * 
 * @param channel - The event channel
 * @param data - The event data
 */
async function publishMCPEvent(channel: string, data: any): Promise<void> {
  try {
    // Store the update in a list for the SSE endpoint to retrieve
    await kv.lpush(`${channel}:updates`, JSON.stringify(data));
    
    // Set expiry to prevent unlimited growth
    await kv.expire(`${channel}:updates`, MCP_CACHE_EXPIRY.EVENT);
    
    // Also store the latest state for immediate access
    await kv.set(`${channel}:latest`, JSON.stringify(data), { ex: MCP_CACHE_EXPIRY.EVENT });
  } catch (error) {
    console.error(`Error publishing MCP event to ${channel}:`, error);
    // Continue execution - this is a non-critical operation
  }
}

/**
 * Connect to an MCP server
 * 
 * Registers a server in the in-memory store and publishes
 * a connection event.
 * 
 * @param server - The MCP server to connect to
 * @returns The connected server
 */
export function connectMCPServer(server: MCPServer): MCPServer {
  // Store the server in memory
  connectedServers[server.name] = server;
  
  // Publish server updated event
  publishMCPEvent(MCP_EVENT_CHANNELS.SERVER_UPDATED, {
    action: 'connect',
    serverName: server.name,
  });
  
  return server;
}

/**
 * Disconnect from an MCP server
 * 
 * Removes a server from the in-memory store and publishes
 * a disconnection event.
 * 
 * @param serverName - The name of the server to disconnect from
 * @returns True if the server was disconnected, false otherwise
 */
export function disconnectMCPServer(serverName: string): boolean {
  // Check if the server exists
  if (!connectedServers[serverName]) {
    return false;
  }
  
  // Remove the server from memory
  delete connectedServers[serverName];
  
  // Publish server updated event
  publishMCPEvent(MCP_EVENT_CHANNELS.SERVER_UPDATED, {
    action: 'disconnect',
    serverName,
  });
  
  return true;
}

/**
 * Get a connected MCP server
 * 
 * Retrieves a server from the in-memory store by name.
 * 
 * @param serverName - The name of the server to get
 * @returns The server or undefined if not found
 */
export function getMCPServer(serverName: string): MCPServer | undefined {
  return connectedServers[serverName];
}

/**
 * Get all connected MCP servers
 * 
 * Retrieves all servers from the in-memory store.
 * 
 * @returns Array of connected servers
 */
export function getConnectedMCPServers(): MCPServer[] {
  return Object.values(connectedServers);
}

/**
 * Execute an MCP tool
 * 
 * Finds the specified tool on the specified server and executes it
 * with the provided arguments. Records the execution in the tool
 * management system and publishes events for real-time updates.
 * 
 * @param serverName - The name of the server
 * @param toolName - The name of the tool
 * @param args - The tool arguments
 * @param context - Optional execution context
 * @returns The tool result
 */
export async function executeMCPTool(
  serverName: string,
  toolName: string,
  args: any,
  context: any = {}
): Promise<any> {
  // Check if the server exists
  const server = connectedServers[serverName];
  if (!server) {
    throw new Error(`MCP server not found: ${serverName}`);
  }
  
  // Check if the tool exists
  const tool = server.tools.find(t => t.name === toolName);
  if (!tool) {
    throw new Error(`Tool not found on server ${serverName}: ${toolName}`);
  }
  
  try {
    // Generate a tool call ID if not provided
    const toolCallId = context.toolCallId || generateUUID();
    
    // Create a tool call record
    if (context.toolCallId) {
      // Process the tool call using the tool manager
      await toolManager.processToolCall({
        chatId: context.chatId || 'system',
        messageId: context.messageId || 'system',
        toolName: `mcp:${serverName}:${toolName}`,
        toolCallId,
        args,
      });
    }
    
    // Execute the tool
    // This is a placeholder for actual tool execution
    // In a real implementation, this would call the appropriate tool handler
    const result = {
      success: true,
      data: {
        message: `Executed tool ${toolName} on server ${serverName}`,
        args,
      },
    };
    
    // Update the tool call status
    if (context.toolCallId) {
      await toolManager.updateToolCallStatus(
        toolCallId,
        ToolStatus.COMPLETED,
        result
      );
    }
    
    // Publish tool executed event
    publishMCPEvent(MCP_EVENT_CHANNELS.TOOL_EXECUTED, {
      serverName,
      toolName,
      args,
      result,
      toolCallId,
    });
    
    return result;
  } catch (error) {
    // Update the tool call status if it failed
    if (context.toolCallId) {
      await toolManager.updateToolCallStatus(
        context.toolCallId,
        ToolStatus.FAILED,
        null,
        String(error)
      );
    }
    
    // Publish tool executed event with error
    publishMCPEvent(MCP_EVENT_CHANNELS.TOOL_EXECUTED, {
      serverName,
      toolName,
      args,
      error: String(error),
      toolCallId: context.toolCallId,
    });
    
    throw error;
  }
}

/**
 * Access an MCP resource
 * 
 * Finds the specified resource on the specified server and accesses it.
 * Publishes events for real-time updates.
 * 
 * @param serverName - The name of the server
 * @param uri - The URI of the resource
 * @param context - Optional access context
 * @returns The resource data
 */
export async function accessMCPResource(
  serverName: string,
  uri: string,
  context: any = {}
): Promise<any> {
  // Check if the server exists
  const server = connectedServers[serverName];
  if (!server) {
    throw new Error(`MCP server not found: ${serverName}`);
  }
  
  // Check if the resource exists
  const resource = server.resources.find(r => r.uri === uri);
  if (!resource) {
    throw new Error(`Resource not found on server ${serverName}: ${uri}`);
  }
  
  try {
    // Access the resource
    // This is a placeholder for actual resource access
    // In a real implementation, this would call the appropriate resource handler
    const result = {
      success: true,
      data: {
        message: `Accessed resource ${uri} on server ${serverName}`,
        uri,
      },
    };
    
    // Publish resource accessed event
    publishMCPEvent(MCP_EVENT_CHANNELS.RESOURCE_ACCESSED, {
      serverName,
      uri,
      result,
    });
    
    return result;
  } catch (error) {
    // Publish resource accessed event with error
    publishMCPEvent(MCP_EVENT_CHANNELS.RESOURCE_ACCESSED, {
      serverName,
      uri,
      error: String(error),
    });
    
    throw error;
  }
}

/**
 * Example MCP server for local file system access
 * This is a development/testing server definition
 */
export const localFileSystemServer: MCPServer = {
  name: 'local-filesystem',
  description: 'Access the local file system',
  version: '1.0.0',
  tools: [
    {
      name: 'read-file',
      description: 'Read a file from the local file system',
      inputSchema: {
        type: 'object',
        required: ['path'],
        properties: {
          path: {
            type: 'string',
            description: 'The path to the file',
          },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The content of the file',
          },
        },
      },
    },
    {
      name: 'write-file',
      description: 'Write a file to the local file system',
      inputSchema: {
        type: 'object',
        required: ['path', 'content'],
        properties: {
          path: {
            type: 'string',
            description: 'The path to the file',
          },
          content: {
            type: 'string',
            description: 'The content to write',
          },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the write was successful',
          },
        },
      },
    },
  ],
  resources: [
    {
      uri: 'file:///tmp',
      description: 'The temporary directory',
    },
    {
      uri: 'file:///home',
      description: 'The home directory',
    },
  ],
};

/**
 * Example MCP server for repository access
 * This is a development/testing server definition
 */
export const repositoryServer: MCPServer = {
  name: 'repository',
  description: 'Access code repositories',
  version: '1.0.0',
  tools: [
    {
      name: 'search-code',
      description: 'Search for code in a repository',
      inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
          repo: {
            type: 'string',
            description: 'The repository to search',
          },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            description: 'The search results',
            items: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'The path to the file',
                },
                line: {
                  type: 'number',
                  description: 'The line number',
                },
                content: {
                  type: 'string',
                  description: 'The matching content',
                },
              },
            },
          },
        },
      },
    },
  ],
  resources: [
    {
      uri: 'repo://github.com/user/repo',
      description: 'A GitHub repository',
    },
  ],
};