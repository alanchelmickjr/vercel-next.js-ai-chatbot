'use client';

import { useState, useRef } from 'react';
import { useCallback } from 'react';

/**
 * Custom hook to interact with the provider registry
 * This provides a client-side interface to the Redis-based provider registry
 */
export function useRegistry() {
  // Use a ref for the cache to avoid re-creating functions when cache changes
  // This prevents unnecessary re-renders in components that use this hook
  const modelCacheRef = useRef<Map<string, any>>(new Map());
  
  // Expose a state-based version for components that need to react to cache changes
  const [modelCacheVersion, setModelCacheVersion] = useState<number>(0);

  /**
   * Get a model from the registry
   * @param modelId The model ID or alias
   * @param type The model type (language, image, embedding)
   * @param userId Optional user ID for user-specific models
   * @returns The model instance or null if not found
   */
  const getModel = useCallback(async (
    modelId: string,
    type: 'language' | 'image' | 'embedding' = 'language',
    userId?: string
  ) => {
    // Check cache first
    const cacheKey = `${type}:${modelId}:${userId || ''}`;
    if (modelCacheRef.current.has(cacheKey)) {
      return modelCacheRef.current.get(cacheKey);
    }

    try {
      // Build the API URL
      const url = new URL('/api/registry', window.location.origin);
      url.searchParams.append('action', 'getModel');
      url.searchParams.append('modelId', modelId);
      url.searchParams.append('type', type);
      if (userId) {
        url.searchParams.append('userId', userId);
      }

      // Fetch the model from the registry API
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch model: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Only update cache and version if the data actually changed
      const existingData = modelCacheRef.current.get(cacheKey);
      const dataChanged = !existingData ||
        JSON.stringify(existingData) !== JSON.stringify(data.model);
      
      if (dataChanged) {
        // Cache the result
        modelCacheRef.current.set(cacheKey, data.model);
        
        // Only update the version if the data actually changed
        setModelCacheVersion(prev => prev + 1);
      }

      return data.model;
    } catch (error) {
      // Silently handle errors to prevent excessive console output
      return null;
    }
  }, []); // No dependencies means this function is stable across renders
  
  /**
   * Get the category for a model ID
   * @param modelId The model ID in provider:model format
   * @returns The category name or null if not found
   */
  const getCategoryForModel = useCallback(async (modelId: string): Promise<string | null> => {
    try {
      // Build the API URL
      const url = new URL('/api/registry', window.location.origin);
      url.searchParams.append('action', 'getCategory');
      url.searchParams.append('modelId', modelId);

      // Fetch the category from the registry API
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch category: ${response.statusText}`);
      }

      const data = await response.json();
      return data.category;
    } catch (error) {
      // Silently handle errors to prevent excessive console output
      return null;
    }
  }, []);

  /**
   * Clear the model cache
   */
  const clearCache = useCallback(() => {
    modelCacheRef.current = new Map();
    setModelCacheVersion(prev => prev + 1);
  }, []);

  return {
    getModel,
    getCategoryForModel,
    clearCache
  };
}