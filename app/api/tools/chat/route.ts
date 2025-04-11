/**
 * Tool Chat API
 * 
 * This API provides an endpoint for retrieving all tool calls for a specific chat.
 * It returns an array of tool calls associated with the chat ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { toolManager } from '@/lib/tools/tool-manager';

/**
 * GET handler for retrieving all tool calls for a chat
 * 
 * URL format: GET /api/tools/chat?chatId={chatId}
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
      // Get all tool calls for the chat using the tool manager
      const toolCalls = await toolManager.getToolCallsByChatId(chatId);
      
      // Return the tool calls
      return NextResponse.json(toolCalls);
    } catch (toolError) {
      console.error('Error retrieving tool calls:', toolError);
      // Return an empty array instead of an error
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error in tool chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}