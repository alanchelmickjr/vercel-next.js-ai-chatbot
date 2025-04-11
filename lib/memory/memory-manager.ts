/**
 * Memory Manager
 * 
 * Purpose: Manage different types of conversation memory
 * 
 * This module provides functionality for:
 * - Storing memories in different categories (task, day, curated)
 * - Retrieving memories relevant to a query
 * - Managing memory expiration
 * - Integrating with Redis for efficient storage
 */

import { kv } from '@vercel/kv';
import { randomUUID } from 'crypto';

// Memory-related constants
const MEMORY_KEY_PREFIX = 'memory:context:';
const MEMORY_EXPIRY = {
  TASK: 60 * 60,        // 1 hour in seconds
  DAY: 24 * 60 * 60,    // 24 hours in seconds
  CURATED: 0            // No expiry (0 means never expire)
};

// Memory item interface
export interface MemoryItem {
  id: string;
  content: string;
  embedding?: number[];
  memoryType: 'task' | 'day' | 'curated';
  createdAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Memory Manager Class
 * 
 * Handles the storage and retrieval of different types of memory
 */
export class MemoryManager {
  private userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  /**
   * Generate a key for Redis storage
   * @param type Memory type
   * @returns Redis key
   */
  private getKey(type: 'task' | 'day' | 'curated'): string {
    return `${MEMORY_KEY_PREFIX}${this.userId}:${type}`;
  }
  
  /**
   * Add a memory item to storage
   * @param content Memory content
   * @param type Memory type ('task', 'day', or 'curated')
   * @param metadata Optional metadata
   * @returns Promise<void>
   */
  async addMemory(
    content: string,
    type: 'task' | 'day' | 'curated',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Create memory item
      const memoryItem: MemoryItem = {
        id: randomUUID(),
        content,
        memoryType: type,
        createdAt: new Date(),
        metadata
      };
      
      // Get the appropriate Redis key
      const key = this.getKey(type);
      
      // Add to Redis list
      await kv.lpush(key, JSON.stringify(memoryItem));
      
      // Set expiry if applicable
      if (MEMORY_EXPIRY[type.toUpperCase() as keyof typeof MEMORY_EXPIRY] > 0) {
        await kv.expire(key, MEMORY_EXPIRY[type.toUpperCase() as keyof typeof MEMORY_EXPIRY]);
      }
      
      console.log(`Added ${type} memory for user ${this.userId}`);
    } catch (error) {
      console.error(`Error adding ${type} memory:`, error);
    }
  }
  
  /**
   * Get task memories
   * @returns Promise<MemoryItem[]>
   */
  async getTaskMemories(): Promise<MemoryItem[]> {
    try {
      const key = this.getKey('task');
      const items = await kv.lrange(key, 0, -1);
      return items.map(item => JSON.parse(item as string)) as MemoryItem[];
    } catch (error) {
      console.error('Error getting task memories:', error);
      return [];
    }
  }
  
  /**
   * Get day memories
   * @returns Promise<MemoryItem[]>
   */
  async getDayMemories(): Promise<MemoryItem[]> {
    try {
      const key = this.getKey('day');
      const items = await kv.lrange(key, 0, -1);
      return items.map(item => JSON.parse(item as string)) as MemoryItem[];
    } catch (error) {
      console.error('Error getting day memories:', error);
      return [];
    }
  }
  
  /**
   * Get curated memories
   * @returns Promise<MemoryItem[]>
   */
  async getCuratedMemories(): Promise<MemoryItem[]> {
    try {
      const key = this.getKey('curated');
      const items = await kv.lrange(key, 0, -1);
      return items.map(item => JSON.parse(item as string)) as MemoryItem[];
    } catch (error) {
      console.error('Error getting curated memories:', error);
      return [];
    }
  }
  
  /**
   * Get all memories
   * @returns Promise<Record<string, MemoryItem[]>>
   */
  async getAllMemories(): Promise<Record<string, MemoryItem[]>> {
    try {
      const [taskMemories, dayMemories, curatedMemories] = await Promise.all([
        this.getTaskMemories(),
        this.getDayMemories(),
        this.getCuratedMemories()
      ]);
      
      return {
        task: taskMemories,
        day: dayMemories,
        curated: curatedMemories
      };
    } catch (error) {
      console.error('Error getting all memories:', error);
      return {
        task: [],
        day: [],
        curated: []
      };
    }
  }
  
  /**
   * Get memories relevant to a query
   * @param query Query to find relevant memories for
   * @param limit Maximum number of memories to return per type
   * @returns Promise<Record<string, MemoryItem[]>>
   */
  async getRelevantMemories(
    query: string,
    limit: number = 5
  ): Promise<Record<string, MemoryItem[]>> {
    try {
      // Get all memories
      const memories = await this.getAllMemories();
      
      // For now, use a simple keyword matching approach
      // In a production system, this would use embeddings and vector similarity
      return {
        task: memories.task.slice(0, limit),
        day: await this.filterRelevantMemories(memories.day, query, limit),
        curated: await this.filterRelevantMemories(memories.curated, query, limit)
      };
    } catch (error) {
      console.error('Error getting relevant memories:', error);
      return {
        task: [],
        day: [],
        curated: []
      };
    }
  }
  
  /**
   * Filter memories by relevance to a query
   * @param memories Array of memory items
   * @param query Query to compare against
   * @param limit Maximum number of memories to return
   * @returns Promise<MemoryItem[]>
   */
  private async filterRelevantMemories(
    memories: MemoryItem[],
    query: string,
    limit: number
  ): Promise<MemoryItem[]> {
    try {
      // Simple keyword matching for now
      // In a production system, this would use embeddings and vector similarity
      const queryWords = query.toLowerCase().split(/\s+/);
      
      // Score each memory based on word overlap
      const scoredMemories = memories.map(memory => {
        const content = memory.content.toLowerCase();
        let score = 0;
        
        // Count matching words
        for (const word of queryWords) {
          if (word.length > 3 && content.includes(word)) {
            score += 1;
          }
        }
        
        return { memory, score };
      });
      
      // Sort by score and take top 'limit'
      return scoredMemories
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.memory);
    } catch (error) {
      console.error('Error filtering relevant memories:', error);
      return memories.slice(0, limit);
    }
  }
  
  /**
   * Clear specific types of memories
   * @param type Memory type to clear ('task', 'day', 'all')
   * @returns Promise<void>
   */
  async clearMemories(type: 'task' | 'day' | 'curated' | 'all'): Promise<void> {
    try {
      if (type === 'all') {
        // Clear all memory types
        const taskKey = this.getKey('task');
        const dayKey = this.getKey('day');
        const curatedKey = this.getKey('curated');
        
        await Promise.all([
          kv.del(taskKey),
          kv.del(dayKey),
          kv.del(curatedKey)
        ]);
        
        console.log(`Cleared all memories for user ${this.userId}`);
      } else {
        // Clear specific memory type
        const key = this.getKey(type);
        await kv.del(key);
        console.log(`Cleared ${type} memories for user ${this.userId}`);
      }
    } catch (error) {
      console.error(`Error clearing ${type} memories:`, error);
    }
  }
  
  /**
   * Clear all memories for a user (alias for clearMemories('all'))
   * @returns Promise<void>
   */
  async clearAllMemories(): Promise<void> {
    return this.clearMemories('all');
  }
}

/**
 * Create a memory manager instance for a user
 * @param userId User ID
 * @returns MemoryManager instance
 */
export function createMemoryManager(userId: string): MemoryManager {
  return new MemoryManager(userId);
}