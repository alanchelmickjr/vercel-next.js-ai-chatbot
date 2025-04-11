/**
 * Tool Execution API
 * 
 * This API provides an endpoint for executing tools with approval.
 * It allows the system to execute tools after they have been approved by the user.
 */

import { NextRequest } from 'next/server';
import { toolManager } from '@/lib/tools/tool-manager';
import { ToolStatus } from '@/lib/db/schema-tool-state';
import { getCachedToolCall } from '@/lib/vercel-kv/tool-state-cache';

export const dynamic = 'force-dynamic';

/**
 * POST handler for executing a tool
 * 
 * URL format: POST /api/tools/execute
 * Body: { toolCallId: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { toolCallId } = body;
    
    if (!toolCallId) {
      return new Response(
        JSON.stringify({ error: 'Tool call ID is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Get the tool call
    const toolCall = await getCachedToolCall(toolCallId);
    
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: 'Tool call not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Check if the tool call is in a valid state for execution
    if (toolCall.status !== ToolStatus.PROCESSING && toolCall.status !== ToolStatus.PENDING) {
      return new Response(
        JSON.stringify({ 
          error: 'Tool call is not in a valid state for execution',
          status: toolCall.status
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Update the tool call status to processing if it's not already
    if (toolCall.status !== ToolStatus.PROCESSING) {
      await toolManager.updateToolCallStatus(
        toolCall.id,
        ToolStatus.PROCESSING
      );
    }
    
    // Execute the tool (this would typically call the actual tool implementation)
    // For now, we'll just simulate a successful execution
    try {
      // In a real implementation, this would execute the actual tool
      // For example, if it's a weather tool, it would call the weather API
      
      // Simulate a delay for the tool execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the tool call status to completed
      const updatedToolCall = await toolManager.updateToolCallStatus(
        toolCall.id,
        ToolStatus.COMPLETED,
        { result: `Tool ${toolCall.toolName} executed successfully` }
      );
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Tool executed successfully',
          toolCall: updatedToolCall
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      // Update the tool call status to failed
      await toolManager.updateToolCallStatus(
        toolCall.id,
        ToolStatus.FAILED,
        null,
        error instanceof Error ? error.message : String(error)
      );
      
      throw error;
    }
  } catch (error) {
    console.error('Error in tool execution API:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}