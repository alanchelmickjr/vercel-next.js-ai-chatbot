/**
 * Memory Tool
 *
 * Purpose: Provide AI with tools to interact with the memory system
 *
 * This module provides:
 * - Tools for storing memories
 * - Tools for retrieving memories
 * - Tools for clearing memories
 */

import { MemoryManager } from '@/lib/memory/memory-manager';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

/**
 * Add Memory Tool
 * 
 * Allows the AI to store a memory in the specified category
 */
export const addMemoryTool = {
  name: 'add_memory',
  description: 'Store a memory for future reference',
  schema: z.object({
    content: z.string().describe('The content to remember'),
    type: z.enum(['task', 'day', 'curated']).describe('The type of memory (task: short-term, day: medium-term, curated: long-term)'),
    metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional metadata about the memory')
  }),
  // Convert schema to JSON schema for API compatibility
  get parameters() {
    return zodToJsonSchema(this.schema);
  },
  execute: async (args: { content: string; type: 'task' | 'day' | 'curated'; metadata?: Record<string, string | number | boolean> }, userId: string) => {
    try {
      // Validate input
      if (!args.content) {
        return {
          success: false,
          message: 'Memory content is required'
        };
      }
      
      // Create memory manager
      const memoryManager = new MemoryManager(userId);
      
      // Add memory
      await memoryManager.addMemory(args.content, args.type, args.metadata);
      
      return {
        success: true,
        message: `Memory added to ${args.type} memories`
      };
    } catch (error) {
      console.error('Error adding memory:', error);
      return {
        success: false,
        message: 'Failed to add memory'
      };
    }
  }
};

/**
 * Get Memories Tool
 * 
 * Allows the AI to retrieve memories of a specific type
 */
export const getMemoriesTool = {
  name: 'get_memories',
  description: 'Retrieve stored memories',
  schema: z.object({
    type: z.enum(['task', 'day', 'curated', 'all']).describe('The type of memories to retrieve'),
    limit: z.number().optional().describe('Maximum number of memories to retrieve per type')
  }),
  // Convert schema to JSON schema for API compatibility
  get parameters() {
    return zodToJsonSchema(this.schema);
  },
  execute: async (args: { type: 'task' | 'day' | 'curated' | 'all'; limit?: number }, userId: string) => {
    try {
      // Create memory manager
      const memoryManager = new MemoryManager(userId);
      
      // Get memories based on type
      let taskMemories: any[] = [];
      let dayMemories: any[] = [];
      let curatedMemories: any[] = [];
      
      if (args.type === 'task' || args.type === 'all') {
        taskMemories = await memoryManager.getTaskMemories();
        taskMemories = taskMemories.slice(0, args.limit || 10);
      }
      
      if (args.type === 'day' || args.type === 'all') {
        dayMemories = await memoryManager.getDayMemories();
        dayMemories = dayMemories.slice(0, args.limit || 10);
      }
      
      if (args.type === 'curated' || args.type === 'all') {
        curatedMemories = await memoryManager.getCuratedMemories();
        curatedMemories = curatedMemories.slice(0, args.limit || 10);
      }
      
      return {
        success: true,
        memories: {
          task: taskMemories,
          day: dayMemories,
          curated: curatedMemories
        }
      };
    } catch (error) {
      console.error('Error retrieving memories:', error);
      return {
        success: false,
        message: 'Failed to retrieve memories'
      };
    }
  }
};

/**
 * Search Memories Tool
 * 
 * Allows the AI to search for memories relevant to a query
 */
export const searchMemoriesTool = {
  name: 'search_memories',
  description: 'Search for memories relevant to a query',
  schema: z.object({
    query: z.string().describe('The query to search for'),
    limit: z.number().optional().describe('Maximum number of memories to retrieve per type')
  }),
  // Convert schema to JSON schema for API compatibility
  get parameters() {
    return zodToJsonSchema(this.schema);
  },
  execute: async (args: { query: string; limit?: number }, userId: string) => {
    try {
      // Create memory manager
      const memoryManager = new MemoryManager(userId);
      
      // Get relevant memories
      const memories = await memoryManager.getRelevantMemories(args.query, args.limit || 5);
      
      return {
        success: true,
        memories
      };
    } catch (error) {
      console.error('Error searching memories:', error);
      return {
        success: false,
        message: 'Failed to search memories'
      };
    }
  }
};

/**
 * Clear Memories Tool
 * 
 * Allows the AI to clear memories of a specific type
 */
export const clearMemoriesTool = {
  name: 'clear_memories',
  description: 'Clear stored memories',
  schema: z.object({
    type: z.enum(['task', 'day', 'all']).describe('The type of memories to clear')
  }),
  // Convert schema to JSON schema for API compatibility
  get parameters() {
    return zodToJsonSchema(this.schema);
  },
  execute: async (args: { type: 'task' | 'day' | 'all' }, userId: string) => {
    try {
      // Create memory manager
      const memoryManager = new MemoryManager(userId);
      
      // Clear memories
      await memoryManager.clearMemories(args.type as 'task' | 'day' | 'curated' | 'all');
      
      return {
        success: true,
        message: `Memories of type "${args.type}" cleared.`
      };
    } catch (error) {
      console.error('Error clearing memories:', error);
      return {
        success: false,
        message: 'Failed to clear memories'
      };
    }
  }
};

/**
 * Export all memory tools
 */
export const memoryTools = [
  addMemoryTool,
  getMemoriesTool,
  searchMemoriesTool,
  clearMemoriesTool
];

/**
 * Get a memory tool by name
 * @param name Tool name
 * @returns Memory tool or undefined if not found
 */
export function getMemoryToolByName(name: string) {
  return memoryTools.find(tool => tool.name === name);
}