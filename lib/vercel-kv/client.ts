/**
 * Vercel KV Cache Client
 *
 * This module provides a unified interface for caching various types of data using Vercel KV.
 * It supports caching for:
 * - Suggestions (personal, default, community)
 * - User prompt history
 * - Tag replacements for dynamic prompts
 * - Memory for conversation context
 * - Search results
 * - Any other application data that benefits from caching
 *
 * The client implements a generic caching pattern with:
 * - Consistent key prefixing
 * - Configurable expiration times
 * - Type-safe interfaces
 * - Error handling with graceful degradation
 */

import { kv } from '@vercel/kv';

/**
 * Cache expiration times in seconds
 * These determine how long different types of data remain valid in the cache
 */
export const CACHE_EXPIRY = {
  // Suggestion-related caches
  DEFAULT_SUGGESTIONS: 60 * 60, // 1 hour
  USER_SUGGESTIONS: 60 * 15, // 15 minutes
  COMMUNITY_SUGGESTIONS: 60 * 60, // 1 hour
  
  // User data caches
  RECENT_PROMPTS: 60 * 60 * 24 * 7, // 1 week
  USER_PREFERENCES: 60 * 60 * 24 * 30, // 30 days
  
  // AI-related caches
  TAG_REPLACEMENTS: 60 * 60 * 24, // 1 day
  MEMORY_CONTEXT: 60 * 60 * 24 * 3, // 3 days
  
  // Provider registry caches
  PROVIDER_REGISTRY: 60 * 60 * 24, // 24 hours
  LANGUAGE_MODEL: 60 * 60, // 1 hour
  EMBEDDING_MODEL: 60 * 60, // 1 hour
  IMAGE_MODEL: 60 * 60, // 1 hour
  ALIAS_RESOLUTION: 60 * 60 * 24, // 24 hours
  
  // Search and retrieval caches
  SEARCH_RESULTS: 60 * 5, // 5 minutes
  EMBEDDING_RESULTS: 60 * 60, // 1 hour
  
  // General purpose cache defaults
  SHORT: 60 * 5, // 5 minutes
  MEDIUM: 60 * 60, // 1 hour
  LONG: 60 * 60 * 24, // 1 day
};
/**
 * Key prefixes for different data types
 * These ensure cache keys are properly namespaced to avoid collisions
 */
export const KEY_PREFIX = {
  // Suggestion-related keys
  USER_PROMPTS: 'user:prompts:',
  USER_SUGGESTIONS: 'user:suggestions:',
  DEFAULT_SUGGESTIONS: 'default:suggestions',
  COMMUNITY_SUGGESTIONS: 'community:suggestions',
  
  // User data keys
  USER_PREFERENCES: 'user:preferences:',
  USER_HISTORY: 'user:history:',
  
  // AI-related keys
  TAG_REPLACEMENTS: 'user:tag-replacements:',
  MEMORY_CONTEXT: 'memory:context:',
  
  // Provider registry keys
  PROVIDER_REGISTRY: 'provider:registry:',
  LANGUAGE_MODEL: 'provider:language-model:',
  EMBEDDING_MODEL: 'provider:embedding-model:',
  IMAGE_MODEL: 'provider:image-model:',
  ALIAS_RESOLUTION: 'provider:alias:',
  
  // Search and retrieval keys
  SEARCH_RESULTS: 'search:results:',
  EMBEDDING_CACHE: 'embeddings:',
  
  // General purpose cache keys
  GENERAL: 'general:',
};
/**
 * Generic cache interface for type safety
 */
interface CacheOptions {
  expiry?: number;  // Expiration time in seconds
  namespace?: string; // Optional namespace for the key
}

/**
 * Get recent prompts for a user from KV store
 *
 * Retrieves the most recent prompts used by a specific user,
 * which can be used for personalization and suggestion generation.
 *
 * @param userId - User ID
 * @param limit - Maximum number of prompts to retrieve
 * @returns Array of recent prompt strings
 */
export async function getRecentPrompts(userId: string, limit = 10): Promise<string[]> {
  try {
    const key = `${KEY_PREFIX.USER_PROMPTS}${userId}`;
    const prompts = await kv.lrange(key, 0, limit - 1);
    return prompts as string[];
  } catch (error) {
    console.error('Error retrieving recent prompts from cache:', error);
    return []; // Return empty array as fallback
  }
}
/**
 * Add a new prompt to a user's history
 *
 * Stores a prompt in the user's history list, maintaining a fixed-size
 * list of the most recent prompts for efficient retrieval and analysis.
 *
 * @param userId - User ID
 * @param prompt - The prompt text to add
 * @param maxPrompts - Maximum number of prompts to store (default: 50)
 */
export async function addPromptToHistory(
  userId: string,
  prompt: string,
  maxPrompts = 50
): Promise<void> {
  try {
    const key = `${KEY_PREFIX.USER_PROMPTS}${userId}`;
    
    // Add the prompt to the front of the list
    await kv.lpush(key, prompt);
    
    // Trim the list to keep only the most recent prompts
    await kv.ltrim(key, 0, maxPrompts - 1);
    
    // Set expiry to prevent unlimited growth
    await kv.expire(key, CACHE_EXPIRY.RECENT_PROMPTS);
  } catch (error) {
    console.error('Error adding prompt to history cache:', error);
    // Continue execution - this is a non-critical operation
  }
}
/**
 * Type definition for a cached suggestion
 *
 * This interface defines the structure of suggestion objects stored in the cache.
 * It matches the database schema but is optimized for cache storage and retrieval.
 */
export interface CachedSuggestion {
  id: string;                           // Unique identifier
  title: string;                        // Display title
  label: string;                        // Short description
  action: string;                       // The prompt template with tags
  complexPrompt?: string;               // Extended system prompt for AI context
  category?: string;                    // Category classification
  source?: 'personal' | 'community';    // Source of the suggestion
  ratingCount?: number;                 // Number of ratings received
  ratingSum?: number;                   // Sum of all ratings
  averageRating?: string;               // Pre-calculated average rating
  visibility?: 'private' | 'public';    // Visibility setting
}
/**
 * Get cached suggestions for a user
 *
 * Retrieves personalized suggestions for a specific user from the cache.
 * These may include both user-created suggestions and ones the system
 * has determined are relevant to the user.
 *
 * @param userId - User ID
 * @returns Array of cached suggestions or null if not in cache
 */
export async function getCachedSuggestions(
  userId: string
): Promise<CachedSuggestion[] | null> {
  try {
    const key = `${KEY_PREFIX.USER_SUGGESTIONS}${userId}`;
    const suggestions = await kv.get<CachedSuggestion[]>(key);
    return suggestions;
  } catch (error) {
    console.error('Error retrieving cached suggestions:', error);
    return null; // Return null to indicate cache miss
  }
}
/**
 * Cache suggestions for a user
 *
 * Stores personalized suggestions for a specific user in the cache
 * to improve performance on subsequent requests.
 *
 * @param userId - User ID
 * @param suggestions - Array of suggestions to cache
 */
export async function cacheSuggestions(
  userId: string,
  suggestions: CachedSuggestion[]
): Promise<void> {
  try {
    const key = `${KEY_PREFIX.USER_SUGGESTIONS}${userId}`;
    await kv.set(key, suggestions, { ex: CACHE_EXPIRY.USER_SUGGESTIONS });
  } catch (error) {
    console.error('Error caching suggestions:', error);
    // Continue execution - this is a non-critical operation
  }
}
/**
 * Get default cached suggestions
 *
 * Retrieves the default set of suggestions that are shown to all users,
 * particularly those who are new or have no personalized suggestions yet.
 *
 * @returns Array of default suggestions or null if not in cache
 */
export async function getDefaultCachedSuggestions(): Promise<CachedSuggestion[] | null> {
  try {
    const suggestions = await kv.get<CachedSuggestion[]>(KEY_PREFIX.DEFAULT_SUGGESTIONS);
    return suggestions;
  } catch (error) {
    console.error('Error retrieving default cached suggestions:', error);
    return null; // Return null to indicate cache miss
  }
}
/**
 * Get community cached suggestions
 *
 * Retrieves community-created suggestions that have been shared publicly.
 * These are typically high-quality or popular suggestions from other users.
 *
 * @returns Array of community suggestions or null if not in cache
 */
export async function getCommunityCachedSuggestions(): Promise<CachedSuggestion[] | null> {
  try {
    const suggestions = await kv.get<CachedSuggestion[]>(KEY_PREFIX.COMMUNITY_SUGGESTIONS);
    return suggestions;
  } catch (error) {
    console.error('Error retrieving community cached suggestions:', error);
    return null; // Return null to indicate cache miss
  }
}
/**
 * Cache default suggestions
 *
 * Stores the default set of suggestions in the cache for quick retrieval.
 * These suggestions are typically seeded from the database.
 *
 * @param suggestions - Array of default suggestions to cache
 */
export async function cacheDefaultSuggestions(
  suggestions: CachedSuggestion[]
): Promise<void> {
  try {
    await kv.set(KEY_PREFIX.DEFAULT_SUGGESTIONS, suggestions, {
      ex: CACHE_EXPIRY.DEFAULT_SUGGESTIONS,
    });
  } catch (error) {
    console.error('Error caching default suggestions:', error);
    // Continue execution - this is a non-critical operation
  }
}
/**
 * Cache community suggestions
 *
 * Stores community-created suggestions in the cache for quick retrieval.
 * These suggestions are typically retrieved from the database.
 *
 * @param suggestions - Array of community suggestions to cache
 */
export async function cacheCommunitySuggestions(
  suggestions: CachedSuggestion[]
): Promise<void> {
  try {
    await kv.set(KEY_PREFIX.COMMUNITY_SUGGESTIONS, suggestions, {
      ex: CACHE_EXPIRY.COMMUNITY_SUGGESTIONS, // Use community-specific expiry
    });
  } catch (error) {
    console.error('Error caching community suggestions:', error);
    // Continue execution - this is a non-critical operation
  }
}
/**
 * Clear all cached suggestions for a user
 *
 * Removes a user's cached suggestions, forcing a refresh from the database
 * on the next request. Useful after significant changes to suggestions.
 *
 * @param userId - User ID
 */
export async function clearCachedSuggestions(userId: string): Promise<void> {
  try {
    const key = `${KEY_PREFIX.USER_SUGGESTIONS}${userId}`;
    await kv.del(key);
  } catch (error) {
    console.error('Error clearing cached suggestions:', error);
    // Continue execution - this is a non-critical operation
  }
}
// ===== MEMORY AND CONTEXT CACHING =====

/**
 * Cache memory context for a conversation
 *
 * Stores conversation memory/context for retrieval during long conversations
 * or when resuming previous conversations.
 *
 * @param userId - User ID
 * @param chatId - Chat/conversation ID
 * @param context - The memory context object to cache
 */
export async function cacheMemoryContext(
  userId: string,
  chatId: string,
  context: any
): Promise<void> {
  try {
    const key = `${KEY_PREFIX.MEMORY_CONTEXT}${userId}:${chatId}`;
    await kv.set(key, context, { ex: CACHE_EXPIRY.MEMORY_CONTEXT });
  } catch (error) {
    console.error('Error caching memory context:', error);
    // Continue execution - this is a non-critical operation
  }
}

/**
 * Get cached memory context for a conversation
 *
 * Retrieves previously stored conversation memory/context.
 *
 * @param userId - User ID
 * @param chatId - Chat/conversation ID
 * @returns The cached memory context or null if not found
 */
export async function getMemoryContext(
  userId: string,
  chatId: string
): Promise<any | null> {
  try {
    const key = `${KEY_PREFIX.MEMORY_CONTEXT}${userId}:${chatId}`;
    return await kv.get(key);
  } catch (error) {
    console.error('Error retrieving memory context:', error);
    return null; // Return null to indicate cache miss
  }
}
// ===== SEARCH RESULTS CACHING =====

/**
 * Cache search results
 *
 * Stores search results to avoid redundant searches for the same query.
 *
 * @param userId - User ID
 * @param query - Search query string
 * @param results - Search results to cache
 */
export async function cacheSearchResults(
  userId: string,
  query: string,
  results: any
): Promise<void> {
  try {
    // Create a deterministic key from the query by normalizing and hashing
    const normalizedQuery = query.trim().toLowerCase();
    const key = `${KEY_PREFIX.SEARCH_RESULTS}${userId}:${normalizedQuery}`;
    await kv.set(key, results, { ex: CACHE_EXPIRY.SEARCH_RESULTS });
  } catch (error) {
    console.error('Error caching search results:', error);
    // Continue execution - this is a non-critical operation
  }
}

/**
 * Get cached search results
 *
 * Retrieves previously cached search results for a query.
 *
 * @param userId - User ID
 * @param query - Search query string
 * @returns Cached search results or null if not found
 */
export async function getCachedSearchResults(
  userId: string,
  query: string
): Promise<any | null> {
  try {
    const normalizedQuery = query.trim().toLowerCase();
    const key = `${KEY_PREFIX.SEARCH_RESULTS}${userId}:${normalizedQuery}`;
    return await kv.get(key);
  } catch (error) {
    console.error('Error retrieving cached search results:', error);
    return null; // Return null to indicate cache miss
  }
}

// ===== TAG REPLACEMENT CACHING =====

/**
 * Get cached tag replacements for a user
 *
 * Retrieves previously generated replacements for dynamic tags in prompts.
 * This helps avoid regenerating the same replacements multiple times.
 *
 * @param userId - User ID
 * @param tagKey - Combined tag key for caching
 * @returns Object mapping tag names to replacement values, or null if not cached
 */
export async function getCachedTagReplacements(
  userId: string,
  tagKey: string
): Promise<Record<string, string> | null> {
  try {
    const key = `${KEY_PREFIX.TAG_REPLACEMENTS}${userId}:${tagKey}`;
    const replacements = await kv.get<Record<string, string>>(key);
    return replacements;
  } catch (error) {
    console.error('Error retrieving cached tag replacements:', error);
    return null; // Return null to indicate cache miss
  }
}
/**
 * Cache tag replacements for a user
 *
 * Stores generated replacements for dynamic tags in prompts.
 *
 * @param userId - User ID
 * @param tagKey - Combined tag key for caching
 * @param replacements - Object mapping tag names to replacement values
 */
export async function cacheTagReplacements(
  userId: string,
  tagKey: string,
  replacements: Record<string, string>
): Promise<void> {
  try {
    const key = `${KEY_PREFIX.TAG_REPLACEMENTS}${userId}:${tagKey}`;
    await kv.set(key, replacements, { ex: CACHE_EXPIRY.TAG_REPLACEMENTS });
  } catch (error) {
    console.error('Error caching tag replacements:', error);
    // Continue execution - this is a non-critical operation
  }
}

// ===== GENERIC CACHE OPERATIONS =====

/**
 * Set a value in the cache with a generic interface
 *
 * Provides a general-purpose caching mechanism for any data type.
 *
 * @param key - The cache key (without prefix)
 * @param value - The value to cache (any serializable data)
 * @param options - Cache options including expiry time and namespace
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<void> {
  try {
    const namespace = options.namespace || KEY_PREFIX.GENERAL;
    const fullKey = `${namespace}${key}`;
    const expiry = options.expiry || CACHE_EXPIRY.MEDIUM;
    
    console.log(`[KV_DEBUG] Setting cache value for key: ${fullKey}, expiry: ${expiry}s`);
    if (namespace === KEY_PREFIX.USER_PREFERENCES) {
      console.log(`[KV_DEBUG] Setting user preferences: ${JSON.stringify(value)}`);
    }
    
    await kv.set(fullKey, value, { ex: expiry });
    console.log(`[KV_DEBUG] Successfully set cache value for key: ${fullKey}`);
  } catch (error) {
    console.error(`[KV_DEBUG] Error setting cache value for key ${key}:`, error);
    // Continue execution - this is a non-critical operation
  }
}

/**
 * Get a value from the cache with a generic interface
 *
 * Retrieves previously cached data of any type.
 *
 * @param key - The cache key (without prefix)
 * @param options - Cache options including namespace
 * @returns The cached value or null if not found
 */
export async function cacheGet<T>(
  key: string,
  options: Omit<CacheOptions, 'expiry'> = {}
): Promise<T | null> {
  try {
    const namespace = options.namespace || KEY_PREFIX.GENERAL;
    const fullKey = `${namespace}${key}`;
    
    console.log(`[KV_DEBUG] Getting cache value for key: ${fullKey}`);
    const value = await kv.get<T>(fullKey);
    
    if (value === null) {
      console.log(`[KV_DEBUG] Cache miss for key: ${fullKey}`);
    } else {
      console.log(`[KV_DEBUG] Cache hit for key: ${fullKey}`);
      if (namespace === KEY_PREFIX.USER_PREFERENCES) {
        console.log(`[KV_DEBUG] Retrieved user preferences: ${JSON.stringify(value)}`);
      }
    }
    
    return value;
  } catch (error) {
    console.error(`[KV_DEBUG] Error getting cache value for key ${key}:`, error);
    return null; // Return null to indicate cache miss
  }
}

/**
 * Delete a value from the cache
 *
 * Removes a previously cached item.
 *
 * @param key - The cache key (without prefix)
 * @param options - Cache options including namespace
 */
export async function cacheDelete(
  key: string,
  options: Omit<CacheOptions, 'expiry'> = {}
): Promise<void> {
  try {
    const namespace = options.namespace || KEY_PREFIX.GENERAL;
    const fullKey = `${namespace}${key}`;
    
    await kv.del(fullKey);
  } catch (error) {
    console.error('Error deleting cache value:', error);
    // Continue execution - this is a non-critical operation
  }
}