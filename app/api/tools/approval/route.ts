/**
 * Tool Approval API
 * 
 * This API provides endpoints for approving or rejecting tool executions.
 * It allows the user to control which tools are allowed to execute.
 */

import { NextRequest } from 'next/server';
import { toolManager } from '@/lib/tools/tool-manager';
import { ToolStatus } from '@/lib/db/schema-tool-state';
import { getCachedToolCall } from '@/lib/vercel-kv/tool-state-cache';

export const dynamic = 'force-dynamic';

/**
 * POST handler for approving a tool execution
 * 
 * URL format: POST /api/tools/approval
 * Body: { toolCallId: string, action: 'approve' | 'reject' }
 */
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { toolCallId, action } = body;
    
    if (!toolCallId) {
      return new Response(
        JSON.stringify({ error: 'Tool call ID is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (!action || (action !== 'approve' && action !== 'reject')) {
      return new Response(
        JSON.stringify({ error: 'Action must be either "approve" or "reject"' }),
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
    
    // Check if the tool call is awaiting approval
    if (toolCall.status !== ToolStatus.AWAITING_APPROVAL) {
      return new Response(
        JSON.stringify({ 
          error: 'Tool call is not awaiting approval',
          status: toolCall.status
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (action === 'approve') {
      // Update the tool call status to processing
      await toolManager.updateToolCallStatus(
        toolCall.id,
        ToolStatus.PROCESSING
      );
      
      // Execute the tool (this would typically be done by a background process)
      // For now, we'll just update the status to completed
      setTimeout(async () => {
        try {
          // In a real implementation, this would execute the actual tool
          // For now, we'll just simulate a successful execution
          await toolManager.updateToolCallStatus(
            toolCall.id,
            ToolStatus.COMPLETED,
            { result: 'Tool execution approved and completed' }
          );
        } catch (error) {
          console.error('Error executing approved tool:', error);
          await toolManager.updateToolCallStatus(
            toolCall.id,
            ToolStatus.FAILED,
            null,
            error instanceof Error ? error.message : String(error)
          );
        }
      }, 1000);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Tool execution approved',
          toolCallId
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      // Update the tool call status to rejected
      await toolManager.updateToolCallStatus(
        toolCall.id,
        ToolStatus.REJECTED,
        null,
        'Tool execution rejected by user'
      );
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Tool execution rejected',
          toolCallId
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Error in tool approval API:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}