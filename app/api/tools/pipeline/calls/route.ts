/**
 * Tool Pipeline Calls API
 * 
 * This API provides an endpoint for retrieving all tool calls for a specific pipeline.
 * It returns an array of tool calls associated with the pipeline ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { toolManager } from '@/lib/tools/tool-manager';

/**
 * GET handler for retrieving all tool calls for a pipeline
 * 
 * URL format: GET /api/tools/pipeline/calls?pipelineId={pipelineId}
 */
export async function GET(req: NextRequest) {
  try {
    // Get the pipeline ID from the query parameters
    const { searchParams } = new URL(req.url);
    const pipelineId = searchParams.get('pipelineId');
    
    if (!pipelineId) {
      return NextResponse.json(
        { error: 'Pipeline ID is required' },
        { status: 400 }
      );
    }
    
    // Authentication is handled by the middleware
    // No need to explicitly check for authentication here
    
    try {
      // Get all tool calls for the pipeline using the tool manager
      const toolCalls = await toolManager.getToolCallsByPipelineId(pipelineId);
      
      // Return the tool calls
      return NextResponse.json(toolCalls);
    } catch (toolError) {
      console.error('Error retrieving tool calls:', toolError);
      // Return an empty array instead of an error
      // This handles the case where the pipeline doesn't exist yet
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error in tool pipeline calls API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}