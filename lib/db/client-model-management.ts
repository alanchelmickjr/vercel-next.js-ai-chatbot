/**
 * Client-side model management functions
 * 
 * This file provides client-safe versions of the model management functions.
 * For read operations, it uses the Redis cache.
 * For write operations, it directly calls the server-side functions.
 */

import { cacheGet, cacheSet, cacheDelete, KEY_PREFIX, CACHE_EXPIRY } from '@/lib/vercel-kv/client';
import { AIModel, ModelCategory, ModelProvider, DEFAULT_CATEGORIES, DEFAULT_PROVIDERS, DEFAULT_MODELS } from './model-management-types';
import { clearProviderCache } from '@/lib/ai/provider-registry';

// Define cache namespace for model registry
const MODEL_REGISTRY_NAMESPACE = 'provider:registry:';

/**
 * Get all model categories from the cache
 * @returns Array of model categories
 */
export async function getCategories(): Promise<ModelCategory[]> {
  // Try to get from cache first
  const cachedCategories = await cacheGet<ModelCategory[]>('categories', { 
    namespace: KEY_PREFIX.PROVIDER_REGISTRY 
  });
  
  if (cachedCategories) {
    return cachedCategories;
  }
  
  // If not in cache, return default categories
  return DEFAULT_CATEGORIES;
}

/**
 * Get all model providers from the cache
 * @returns Array of model providers
 */
export async function getProviders(): Promise<ModelProvider[]> {
  // Try to get from cache first
  const cachedProviders = await cacheGet<ModelProvider[]>('providers', { 
    namespace: KEY_PREFIX.PROVIDER_REGISTRY 
  });
  
  if (cachedProviders) {
    return cachedProviders;
  }
  
  // If not in cache, return default providers
  return DEFAULT_PROVIDERS;
}

/**
 * Get all AI models from the cache
 * @returns Array of AI models
 */
export async function getModels(): Promise<AIModel[]> {
  // Try to get from cache first
  const cachedModels = await cacheGet<AIModel[]>('models', { 
    namespace: KEY_PREFIX.PROVIDER_REGISTRY 
  });
  
  if (cachedModels) {
    return cachedModels;
  }
  
  // If not in cache, return default models
  return DEFAULT_MODELS;
}

/**
 * Get a specific AI model by ID from the cache
 * @param id The model ID
 * @returns The model or null if not found
 */
export async function getModelById(id: string): Promise<AIModel | null> {
  const models = await getModels();
  return models.find(model => model.id === id) || null;
}

/**
 * Create a new AI model
 * @param model The model to create
 * @returns The created model
 */
export async function createAIModel(model: Omit<AIModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIModel> {
  // Call the server-side API
  const response = await fetch('/api/registry/models', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(model),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create model: ${response.statusText}`);
  }
  
  // Refresh the cache
  await refreshModelCache();
  
  return await response.json();
}

/**
 * Update an existing AI model
 * @param id The model ID
 * @param updates The updates to apply
 */
export async function updateAIModel(id: string, updates: Partial<AIModel>): Promise<void> {
  // Call the server-side API
  const response = await fetch(`/api/registry/models/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update model: ${response.statusText}`);
  }
  
  // Refresh the cache
  await refreshModelCache();
}

/**
 * Delete an AI model
 * @param id The model ID
 */
export async function deleteAIModel(id: string): Promise<void> {
  // Call the server-side API
  const response = await fetch(`/api/registry/models/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete model: ${response.statusText}`);
  }
  
  // Refresh the cache
  await refreshModelCache();
}

/**
 * Create a new model category
 * @param category The category to create
 */
export async function createModelCategory(category: Omit<ModelCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  // Call the server-side API through a server action
  try {
    // Import the server action
    const { createModelCategoryAction } = await import('./model-management-actions');
    
    // Call the server action
    await createModelCategoryAction(category);
    
    // Refresh the cache
    await refreshModelCache();
  } catch (error) {
    console.error('Error creating category:', error);
    throw new Error('Failed to create category');
  }
}

/**
 * Delete a model category
 * @param id The category ID
 */
export async function deleteModelCategory(id: string): Promise<void> {
  // Call the server-side API through a server action
  try {
    // Import the server action
    const { deleteModelCategoryAction } = await import('./model-management-actions');
    
    // Call the server action
    await deleteModelCategoryAction(id);
    
    // Refresh the cache
    await refreshModelCache();
  } catch (error) {
    console.error('Error deleting category:', error);
    throw new Error('Failed to delete category');
  }
}

/**
 * Refresh the model cache
 */
export async function refreshModelCache(): Promise<void> {
  try {
    // Clear the provider cache
    await clearProviderCache();
    
    // Call the server-side API to refresh the cache
    const response = await fetch('/api/registry/refresh', {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to refresh cache: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error refreshing cache:', error);
    throw new Error('Failed to refresh cache');
  }
}

// Aliases for backward compatibility
export const getAllCategories = getCategories;
export const getAllProviders = getProviders;
export const getAllModels = getModels;