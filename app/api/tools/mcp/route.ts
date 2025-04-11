/**
 * MCP Tool API
 * 
 * This API provides endpoints for interacting with MCP servers, tools, and resources.
 * It allows the frontend to:
 * - List connected MCP servers
 * - Execute MCP tools
 * - Access MCP resources
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getConnectedMCPServers, 
  getMCPServer, 
  executeMCPTool, 
  accessMCPResource,
  connectMCPServer,
  localFileSystemServer,
  repositoryServer
} from '@/lib/tools/mcp-tool-client';

// Connect default servers on startup
connectMCPServer(localFileSystemServer);
connectMCPServer(repositoryServer);

/**
 * GET handler for listing MCP servers and tools
 * 
 * URL format: GET /api/tools/mcp
 */
export async function GET(req: NextRequest) {
  try {
    // Get all connected servers
    const servers = getConnectedMCPServers();
    
    return NextResponse.json({ servers });
  } catch (error) {
    console.error('Error in MCP API GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for executing MCP tools
 * 
 * URL format: POST /api/tools/mcp
 * Body format:
 * {
 *   "action": "execute_tool" | "access_resource",
 *   "serverName": "server-name",
 *   "toolName": "tool-name",  // Only for execute_tool
 *   "uri": "resource-uri",    // Only for access_resource
 *   "args": { ... },          // Only for execute_tool
 *   "context": { ... }        // Optional execution context
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    
    // Validate the request
    if (!body.action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }
    
    if (!body.serverName) {
      return NextResponse.json(
        { error: 'Server name is required' },
        { status: 400 }
      );
    }
    
    // Check if the server exists
    const server = getMCPServer(body.serverName);
    if (!server) {
      return NextResponse.json(
        { error: `MCP server not found: ${body.serverName}` },
        { status: 404 }
      );
    }
    
    // Handle different actions
    if (body.action === 'execute_tool') {
      // Validate tool execution request
      if (!body.toolName) {
        return NextResponse.json(
          { error: 'Tool name is required' },
          { status: 400 }
        );
      }
      
      // Check if the tool exists
      const tool = server.tools.find(t => t.name === body.toolName);
      if (!tool) {
        return NextResponse.json(
          { error: `Tool not found on server ${body.serverName}: ${body.toolName}` },
          { status: 404 }
        );
      }
      
      // Execute the tool
      try {
        const result = await executeMCPTool(
          body.serverName,
          body.toolName,
          body.args || {},
          body.context || {}
        );
        
        return NextResponse.json({ result });
      } catch (toolError) {
        console.error('Error executing MCP tool:', toolError);
        return NextResponse.json(
          { error: String(toolError) },
          { status: 500 }
        );
      }
    } else if (body.action === 'access_resource') {
      // Validate resource access request
      if (!body.uri) {
        return NextResponse.json(
          { error: 'Resource URI is required' },
          { status: 400 }
        );
      }
      
      // Check if the resource exists
      const resource = server.resources.find(r => r.uri === body.uri);
      if (!resource) {
        return NextResponse.json(
          { error: `Resource not found on server ${body.serverName}: ${body.uri}` },
          { status: 404 }
        );
      }
      
      // Access the resource
      try {
        const result = await accessMCPResource(
          body.serverName,
          body.uri,
          body.context || {}
        );
        
        return NextResponse.json({ result });
      } catch (resourceError) {
        console.error('Error accessing MCP resource:', resourceError);
        return NextResponse.json(
          { error: String(resourceError) },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: `Unknown action: ${body.action}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in MCP API POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}