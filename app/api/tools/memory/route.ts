/**
 * Memory Tool API Route
 * 
 * Purpose: Handle memory tool operations for AI models
 * 
 * This module provides an API endpoint for AI models to:
 * - Add memories
 * - Retrieve memories
 * - Clear memories
 * - Search memories
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { 
  addMemoryTool, 
  getMemoriesTool, 
  clearMemoriesTool, 
  searchMemoriesTool,
  getMemoryToolByName
} from '@/lib/ai/tools/memory-tool';

/**
 * POST /api/tools/memory
 * 
 * Execute a memory tool operation
 * 
 * Request body:
 * - tool: The name of the tool to execute
 * - args: The arguments for the tool
 */
export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { tool, args } = body;
    
    // Validate required fields
    if (!tool || !args) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get the memory tool
    const memoryTool = getMemoryToolByName(tool);
    
    if (!memoryTool) {
      return NextResponse.json({ error: 'Invalid memory tool' }, { status: 400 });
    }
    
    // Execute the tool
    const result = await memoryTool.execute(args, session.user.id);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error executing memory tool:', error);
    return NextResponse.json({ error: 'Failed to execute memory tool' }, { status: 500 });
  }
}

/**
 * GET /api/tools/memory
 * 
 * Get available memory tools and their descriptions
 */
export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Return available memory tools
    const tools = [
      addMemoryTool,
      getMemoriesTool,
      clearMemoriesTool,
      searchMemoriesTool
    ].map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
    
    return NextResponse.json({
      success: true,
      tools
    });
  } catch (error) {
    console.error('Error getting memory tools:', error);
    return NextResponse.json({ error: 'Failed to get memory tools' }, { status: 500 });
  }
}