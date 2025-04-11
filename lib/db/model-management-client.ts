"use client"
// This file is for client-side use only
// It uses fetch API calls instead of direct database access
// Added diagnostic log to verify this file is being used
console.log('[model-management-client.ts] Loading client-side model management');

// Import types and default data from model-management-types.ts
import {
  type ModelProvider,
  type ModelCategory,
  type AIModel,
  DEFAULT_CATEGORIES,
  DEFAULT_PROVIDERS,
  DEFAULT_MODELS
} from './model-management-types';

// Re-export types and default data for convenience
export type { ModelProvider, ModelCategory, AIModel };
export { DEFAULT_CATEGORIES, DEFAULT_PROVIDERS, DEFAULT_MODELS };

// Helper function to get the base URL for API calls
function getBaseUrl(): string {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // In server environment, use the environment variable or default to localhost
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
}

// Client-side API functions that use fetch instead of direct DB access
export async function getAllProviders(): Promise<ModelProvider[]> {
  try {
    const baseUrl = getBaseUrl();
    console.log(`[${new Date().toISOString()}] Fetching providers from ${baseUrl}/api/providers`);
    
    const response = await fetch(`${baseUrl}/api/providers`);
    if (!response.ok) {
      throw new Error(`Failed to fetch providers: ${response.status}`);
    }
    const data = await response.json();
    
    console.log(`[${new Date().toISOString()}] Fetched ${data.length} providers from API`);
    
    // Map API response to ModelProvider type
    return data.map((provider: any) => ({
      id: provider.id,
      name: provider.name,
      description: provider.description,
      logoUrl: provider.logoUrl,
      apiConfigKey: provider.authType === 'apiKey' ? `${provider.name.toUpperCase()}_API_KEY` : '',
      isEnabled: provider.isEnabled,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching providers:`, error);
    console.log(`[${new Date().toISOString()}] Falling back to default providers`);
    return DEFAULT_PROVIDERS;
  }
}

export async function getAllCategories(): Promise<ModelCategory[]> {
  try {
    const baseUrl = getBaseUrl();
    console.log(`[${new Date().toISOString()}] Fetching categories from ${baseUrl}/api/categories`);
    
    const response = await fetch(`${baseUrl}/api/categories`);
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status}`);
    }
    const data = await response.json();
    
    console.log(`[${new Date().toISOString()}] Fetched ${data.length} categories from API`);
    
    // Map API response to ModelCategory type
    return data.map((category: any) => ({
      id: category.id,
      name: category.name,
      type: category.type as 'text' | 'image' | 'video' | 'audio' | 'embedding',
      description: category.description,
      order: category.order || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching categories:`, error);
    console.log(`[${new Date().toISOString()}] Falling back to default categories`);
    return DEFAULT_CATEGORIES;
  }
}

export async function getAllModels(): Promise<AIModel[]> {
  try {
    const baseUrl = getBaseUrl();
    console.log(`[${new Date().toISOString()}] Fetching models from ${baseUrl}/api/models`);
    
    const response = await fetch(`${baseUrl}/api/models`);
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    const data = await response.json();
    
    console.log(`[${new Date().toISOString()}] Fetched ${data.length} models from API`);
    
    // Get providers and categories for joining
    const providers = await getAllProviders();
    const categories = await getAllCategories();
    
    // Map API response to AIModel type
    return data.map((model: any) => {
      // Find provider
      const provider = providers.find(p => p.id === model.providerId);
      
      // Find categories
      const modelCategories = categories.filter(c =>
        model.categoryIds && model.categoryIds.includes(c.id)
      );
      
      return {
        id: model.id,
        providerId: model.providerId || '',
        categoryIds: model.categoryIds || [],
        modelId: model.modelId,
        displayName: model.displayName,
        description: model.description,
        contextLength: model.contextLength,
        capabilities: model.capabilities || [],
        isEnabled: model.isEnabled === undefined ? true : model.isEnabled,
        isPrimary: model.isPrimary === undefined ? false : model.isPrimary,
        pricing: model.pricing,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Joined fields
        provider: provider,
        categories: model.categories || modelCategories
      };
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return DEFAULT_MODELS;
  }
}

/**
 * Get a model by its ID
 * @param id The model ID to look up
 * @returns The model if found, or undefined if not found
 */
export async function getModelById(id: string): Promise<AIModel | undefined> {
  try {
    // First try to get all models and find the one with the matching ID
    const models = await getAllModels();
    const model = models.find(m => m.id === id);
    
    if (model) {
      return model;
    }
    
    // If not found in the cached models, try to fetch it directly from the API
    const baseUrl = getBaseUrl();
    console.log(`[${new Date().toISOString()}] Fetching model ${id} from ${baseUrl}/api/models/${id}`);
    
    const response = await fetch(`${baseUrl}/api/models/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[${new Date().toISOString()}] Model ${id} not found`);
        return undefined;
      }
      throw new Error(`Failed to fetch model: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[${new Date().toISOString()}] Fetched model ${id} from API`);
    
    // Get providers and categories for joining
    const providers = await getAllProviders();
    const categories = await getAllCategories();
    
    // Find provider
    const provider = providers.find(p => p.id === data.providerId);
    
    // Find categories
    const modelCategories = categories.filter(c =>
      data.categoryIds && data.categoryIds.includes(c.id)
    );
    
    return {
      id: data.id,
      providerId: data.providerId || '',
      categoryIds: data.categoryIds || [],
      modelId: data.modelId,
      displayName: data.displayName,
      description: data.description,
      contextLength: data.contextLength,
      capabilities: data.capabilities || [],
      isEnabled: data.isEnabled === undefined ? true : data.isEnabled,
      isPrimary: data.isPrimary === undefined ? false : data.isPrimary,
      pricing: data.pricing,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Joined fields
      provider: provider,
      categories: data.categories || modelCategories
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching model ${id}:`, error);
    
    // Try to find the model in the default models
    const defaultModel = DEFAULT_MODELS.find(m => m.id === id);
    if (defaultModel) {
      console.log(`[${new Date().toISOString()}] Found model ${id} in default models`);
      return defaultModel;
    }
    
    return undefined;
  }
}

export async function createModel(model: Omit<AIModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    const baseUrl = getBaseUrl();
    console.log(`[${new Date().toISOString()}] Creating model at ${baseUrl}/api/models`);
    
    const response = await fetch(`${baseUrl}/api/models`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(model),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to create model: ${response.status}`);
    }
    
    console.log(`[${new Date().toISOString()}] Model created successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error creating model:`, error);
    throw error;
  }
}

export async function updateModel(id: string, model: Partial<AIModel>): Promise<void> {
  try {
    const baseUrl = getBaseUrl();
    console.log(`[${new Date().toISOString()}] Updating model ${id} at ${baseUrl}/api/models/${id}`);
    
    const response = await fetch(`${baseUrl}/api/models/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(model),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to update model: ${response.status}`);
    }
    
    console.log(`[${new Date().toISOString()}] Model ${id} updated successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating model ${id}:`, error);
    throw error;
  }
}

export async function deleteModel(id: string): Promise<void> {
  try {
    const baseUrl = getBaseUrl();
    console.log(`[${new Date().toISOString()}] Deleting model ${id} at ${baseUrl}/api/models/${id}`);
    
    const response = await fetch(`${baseUrl}/api/models/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to delete model: ${response.status}`);
    }
    
    console.log(`[${new Date().toISOString()}] Model ${id} deleted successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting model ${id}:`, error);
    throw error;
  }
}