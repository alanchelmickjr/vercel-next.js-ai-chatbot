/**
 * Tool Pipeline Chat API
 * 
 * This API provides an endpoint for retrieving all tool pipelines for a specific chat.
 * It returns an array of pipelines associated with the chat ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { toolManager } from '@/lib/tools/tool-manager';

/**
 * GET handler for retrieving all pipelines for a chat
 * 
 * URL format: GET /api/tools/pipeline/chat?chatId={chatId}
 */
export async function GET(req: NextRequest) {
  try {
    // Get the chat ID from the query parameters
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');
    
    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }
    
    // Authentication is handled by the middleware
    // No need to explicitly check for authentication here
    
    try {
      // Get all pipelines for the chat using the tool manager
      // No need to check if chat exists - if it doesn't, we'll just get an empty array
      const pipelines = await toolManager.getPipelinesByChatId(chatId);
      
      // Return the pipelines
      return NextResponse.json(pipelines);
    } catch (error) {
      console.error('Error retrieving pipelines:', error);
      // Return an empty array instead of an error
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error in tool pipeline chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}