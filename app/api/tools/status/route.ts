/**
 * Tool Status API
 * 
 * This API provides endpoints for checking the status of tool calls.
 * It returns the current state of a tool call, including its status,
 * result, and error information if applicable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToolCallById } from '@/lib/db/queries/tool-state';
import { ToolStatus } from '@/lib/db/schema-tool-state';
import { toolManager } from '@/lib/tools/tool-manager';

/**
 * GET handler for tool status
 * 
 * URL format: GET /api/tools/status?toolCallId={toolCallId}
 */
export async function GET(req: NextRequest) {
  try {
    // Get the tool call ID from the query parameters
    const { searchParams } = new URL(req.url);
    const toolCallId = searchParams.get('toolCallId');
    
    if (!toolCallId) {
      return NextResponse.json(
        { error: 'Tool call ID is required' },
        { status: 400 }
      );
    }
    
    // Authentication is handled by the middleware
    // No need to explicitly check for authentication here
    
    try {
      // Get the tool call
      const toolCall = await getToolCallById(toolCallId);
      
      if (!toolCall) {
        // Return a default empty tool call object instead of a 404 error
        // This handles the case where the tool call doesn't exist yet
        return NextResponse.json({
          id: toolCallId,
          status: ToolStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // Return the tool call
      return NextResponse.json(toolCall);
    } catch (error) {
      console.error('Error retrieving tool call:', error);
      // Return a default empty tool call object instead of an error
      return NextResponse.json({
        id: toolCallId,
        status: ToolStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  } catch (error) {
    console.error('Error in tool status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for updating tool status
 *
 * Body format:
 * {
 *   toolCallId: string;
 *   status: ToolStatus;
 *   action?: 'approve' | 'reject';
 *   result?: any;
 *   error?: string;
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { toolCallId, status, action, result, error } = body;
    
    if (!toolCallId) {
      return NextResponse.json(
        { error: 'Tool call ID is required' },
        { status: 400 }
      );
    }
    
    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }
    
    // Authentication is handled by the middleware
    // No need to explicitly check for authentication here
    
    try {
      // Update the tool call status
      const updatedToolCall = await toolManager.updateToolCallStatus(
        toolCallId,
        status,
        result,
        error
      );
      
      if (!updatedToolCall) {
        return NextResponse.json(
          { error: 'Tool call not found' },
          { status: 404 }
        );
      }
      
      // If this is an approval action, execute the tool
      if (action === 'approve' && status === ToolStatus.PROCESSING) {
        // The tool execution will be handled by the tool manager
        // We just need to update the status to PROCESSING
        console.log(`Tool call ${toolCallId} approved for execution`);
      }
      
      // If this is a rejection action, mark the tool as rejected
      if (action === 'reject' && status === ToolStatus.REJECTED) {
        console.log(`Tool call ${toolCallId} rejected by user`);
      }
      
      // Return the updated tool call
      return NextResponse.json(updatedToolCall);
    } catch (error) {
      console.error('Error updating tool call:', error);
      return NextResponse.json(
        { error: 'Failed to update tool call' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in tool status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}