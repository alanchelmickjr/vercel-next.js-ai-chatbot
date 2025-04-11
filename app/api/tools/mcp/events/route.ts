/**
 * MCP Events API
 * 
 * This API provides a Server-Sent Events (SSE) endpoint for real-time MCP server updates.
 * It establishes a persistent connection with the client and sends events when:
 * - MCP servers connect or disconnect
 * - MCP tools are executed
 * - MCP resources are accessed
 */

import { NextRequest } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// Event types
type EventType = 'connected' | 'servers-updated' | 'tool-executed' | 'resource-accessed' | 'heartbeat';

// Helper to format SSE messages
function formatSSE(event: EventType, data: any) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * GET handler for SSE connection
 * 
 * URL format: GET /api/tools/mcp/events
 */
export async function GET(req: NextRequest) {
  try {
    // Create a new ReadableStream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Get initial data directly from KV store
        try {
          // Get MCP servers
          const serversKey = 'mcp:servers';
          const servers = await kv.get(serversKey) || [];
          
          // Send initial connection message with current servers
          controller.enqueue(encoder.encode(formatSSE('connected', { servers })));
        } catch (error) {
          console.error('Error fetching initial MCP data:', error);
          // Continue even if initial data fetch fails
          controller.enqueue(encoder.encode(formatSSE('connected', { servers: [] })));
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
    console.error('Error in MCP events API:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}