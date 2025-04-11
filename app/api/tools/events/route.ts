/**
 * Tool Events API
 * 
 * This API provides a Server-Sent Events (SSE) endpoint for real-time tool state updates.
 * It establishes a persistent connection with the client and sends events when tool states change.
 */

import { NextRequest } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// Event types
type EventType =
  | 'connected'
  | 'tool-call-updated'
  | 'tool-pipeline-updated'
  | 'heartbeat'
  | 'tool-execution-started'
  | 'tool-execution-progress'
  | 'tool-execution-completed'
  | 'tool-execution-failed'
  | 'chat-tools-updated'
  | 'tool-approval-required'
  | 'tool-rejected';

// Helper to format SSE messages
function formatSSE(event: EventType, data: any) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Helper function to map tool status to event type
 */
function getToolExecutionEventType(status: string): EventType {
  switch (status) {
    case 'PENDING':
      return 'tool-execution-started';
    case 'PROCESSING':
      return 'tool-execution-progress';
    case 'COMPLETED':
      return 'tool-execution-completed';
    case 'FAILED':
      return 'tool-execution-failed';
    case 'AWAITING_APPROVAL':
      return 'tool-approval-required';
    case 'REJECTED':
      return 'tool-rejected';
    default:
      return 'tool-call-updated';
  }
}

/**
 * GET handler for SSE connection
 * 
 * URL format: GET /api/tools/events?chatId={chatId}
 */
export async function GET(req: NextRequest) {
  try {
    // Get the chat ID from the query parameters
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');
    
    if (!chatId) {
      return new Response(
        JSON.stringify({ error: 'Chat ID is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Create a new ReadableStream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection message
        controller.enqueue(encoder.encode(formatSSE('connected', { chatId })));
        
        // Get initial data directly from KV store
        try {
          // Get tool calls for this chat
          const toolCallsKey = `chat:${chatId}:toolCalls`;
          const toolCalls = await kv.get(toolCallsKey) || [];
          
          if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
            controller.enqueue(encoder.encode(formatSSE('tool-call-updated', { 
              type: 'initial',
              toolCalls 
            })));
            
            // Send detailed execution events for each tool call
            for (const toolCall of toolCalls) {
              const eventType = getToolExecutionEventType(toolCall.status);
              controller.enqueue(encoder.encode(formatSSE(eventType, {
                toolCall,
                timestamp: Date.now()
              })));
            }
          }
          
          // Get pipelines for this chat
          const pipelinesKey = `chat:${chatId}:pipelines`;
          const pipelines = await kv.get(pipelinesKey) || [];
          
          if (pipelines && Array.isArray(pipelines) && pipelines.length > 0) {
            controller.enqueue(encoder.encode(formatSSE('tool-pipeline-updated', { 
              type: 'initial',
              pipelines 
            })));
            
            // Send detailed execution events for each pipeline
            for (const pipeline of pipelines) {
              const eventType = getToolExecutionEventType(pipeline.status);
              controller.enqueue(encoder.encode(formatSSE(eventType, {
                pipeline,
                timestamp: Date.now()
              })));
            }
          }
        } catch (error) {
          console.error('Error fetching initial data:', error);
          // Continue even if initial data fetch fails
        }
        
        // Set up heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
          controller.enqueue(encoder.encode(formatSSE('heartbeat', { timestamp: Date.now() })));
        }, 30000); // Every 30 seconds
        
        // Clean up when the connection is closed
        req.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval);
        });
      }
    });
    
    // Return the SSE stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering for Nginx
      },
    });
  } catch (error) {
    console.error('Error in tool events API:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}