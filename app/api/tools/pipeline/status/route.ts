/**
 * Tool Pipeline Status API
 * 
 * This API provides an endpoint for checking the status of a tool pipeline.
 * It returns the current state of a pipeline, including its status,
 * progress, and metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { toolManager } from '@/lib/tools/tool-manager';

/**
 * GET handler for pipeline status
 * 
 * URL format: GET /api/tools/pipeline/status?pipelineId={pipelineId}
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
      // Get the pipeline using the tool manager
      const pipeline = await toolManager.getToolPipelineById(pipelineId);
      
      if (!pipeline) {
        // Return a default empty pipeline object instead of a 404 error
        // This handles the case where the pipeline doesn't exist yet
        return NextResponse.json({
          id: pipelineId,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // Return the pipeline
      return NextResponse.json(pipeline);
    } catch (toolError) {
      console.error('Error retrieving pipeline:', toolError);
      // Return a default empty pipeline object instead of an error
      return NextResponse.json({
        id: pipelineId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  } catch (error) {
    console.error('Error in tool pipeline status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}