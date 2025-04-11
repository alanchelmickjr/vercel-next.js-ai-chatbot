/**
 * Memory API Route
 * 
 * Purpose: Handle memory operations for the memory system
 * 
 * This module provides API endpoints for:
 * - Adding memories
 * - Retrieving memories
 * - Clearing memories
 * - Getting memories relevant to a query
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { MemoryManager } from '@/lib/memory/memory-manager';
import { db } from '@/lib/db/connection';
import { memoryItems } from '@/lib/db/schema-memory';
import { eq, and } from 'drizzle-orm';

/**
 * GET handler for memory retrieval
 * 
 * Query parameters:
 * - type: Memory type to retrieve ('task', 'day', 'curated', 'all')
 * - query: Optional search query for relevant memories
 * - limit: Maximum number of memories to retrieve per type
 */
export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all';
    const query = searchParams.get('query') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    // Create memory manager
    const memoryManager = new MemoryManager(userId);
    
    // Handle different memory retrieval types
    if (query) {
      // Search for relevant memories
      const memories = await memoryManager.getRelevantMemories(query, limit);
      
      return NextResponse.json({
        memories
      });
    } else if (type === 'all') {
      // Get all memory types
      const memories = await memoryManager.getAllMemories();
      
      // Limit the number of memories returned
      const limitedMemories = {
        task: memories.task.slice(0, limit),
        day: memories.day.slice(0, limit),
        curated: memories.curated.slice(0, limit)
      };
      
      return NextResponse.json({
        memories: limitedMemories
      });
    } else {
      // Get specific memory type
      let taskMemories: any[] = [];
      let dayMemories: any[] = [];
      let curatedMemories: any[] = [];
      
      if (type === 'task') {
        taskMemories = await memoryManager.getTaskMemories();
        taskMemories = taskMemories.slice(0, limit);
      }
      
      if (type === 'day') {
        dayMemories = await memoryManager.getDayMemories();
        dayMemories = dayMemories.slice(0, limit);
      }
      
      if (type === 'curated') {
        curatedMemories = await memoryManager.getCuratedMemories();
        curatedMemories = curatedMemories.slice(0, limit);
      }
      
      return NextResponse.json({
        memories: {
          task: taskMemories,
          day: dayMemories,
          curated: curatedMemories
        }
      });
    }
  } catch (error) {
    console.error('Error retrieving memories:', error);
    return NextResponse.json({ error: 'Failed to retrieve memories' }, { status: 500 });
  }
}

/**
 * POST handler for adding memories
 * 
 * Request body:
 * - content: Memory content
 * - type: Memory type ('task', 'day', 'curated')
 * - metadata: Optional metadata
 */
export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Parse request body
    const { content, type, metadata } = await request.json();
    
    // Validate required fields
    if (!content || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate memory type
    if (!['task', 'day', 'curated'].includes(type)) {
      return NextResponse.json({ error: 'Invalid memory type' }, { status: 400 });
    }
    
    // Create memory manager
    const memoryManager = new MemoryManager(userId);
    
    // Add memory
    await memoryManager.addMemory(content, type, metadata);
    
    // For curated memories, also store in database for persistence
    if (type === 'curated') {
      await db.insert(memoryItems).values({
        userId,
        content,
        memoryType: type,
        metadata: metadata ? JSON.stringify(metadata) : null,
        createdAt: new Date()
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Memory added successfully'
    });
  } catch (error) {
    console.error('Error adding memory:', error);
    return NextResponse.json({ error: 'Failed to add memory' }, { status: 500 });
  }
}

/**
 * DELETE handler for clearing memories
 * 
 * Query parameters:
 * - type: Memory type to clear ('task', 'day', 'all')
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get user session
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all';
    
    // Validate memory type
    if (!['task', 'day', 'curated', 'all'].includes(type)) {
      return NextResponse.json({ error: 'Invalid memory type' }, { status: 400 });
    }
    
    // Create memory manager to clear from Redis/Vercel KV
    const memoryManager = new MemoryManager(userId);
    
    // Clear memories from both Redis and database
    await memoryManager.clearMemories(type as 'task' | 'day' | 'curated' | 'all');
    
    // Also delete from database for persistence
    if (type === 'task' || type === 'all') {
      await db.delete(memoryItems).where(
        and(
          eq(memoryItems.userId, userId),
          eq(memoryItems.memoryType, 'task')
        )
      );
    }
    
    if (type === 'day' || type === 'all') {
      await db.delete(memoryItems).where(
        and(
          eq(memoryItems.userId, userId),
          eq(memoryItems.memoryType, 'day')
        )
      );
    }
    
    if (type === 'curated' || type === 'all') {
      await db.delete(memoryItems).where(
        and(
          eq(memoryItems.userId, userId),
          eq(memoryItems.memoryType, 'curated')
        )
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Memories of type "${type}" cleared successfully`
    });
  } catch (error) {
    console.error('Error clearing memories:', error);
    return NextResponse.json({ error: 'Failed to clear memories' }, { status: 500 });
  }
}