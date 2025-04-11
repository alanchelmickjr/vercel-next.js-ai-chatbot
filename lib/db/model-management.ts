// This file is for server-side use only
// It imports from queries.ts which has 'server-only'
// Added diagnostic log to verify this file is being used
console.log('[model-management.ts] Loading server-side model management');

// Import types and default data from model-management-types.ts
import {
  type ModelProvider,
  type ModelCategory,
  type AIModel,
  DEFAULT_CATEGORIES,
  DEFAULT_PROVIDERS,
  DEFAULT_MODELS,
  getKnownCategoryTypes
} from './model-management-types';

// Re-export types and default data for convenience
export type { ModelProvider, ModelCategory, AIModel };
export { DEFAULT_CATEGORIES, DEFAULT_PROVIDERS, DEFAULT_MODELS, getKnownCategoryTypes };

// Import database functions from queries.ts
import {
  getProviders,
  getCategories,
  getModels,
  createModelProvider,
  createModelCategory,
  createAIModel,
  updateAIModel,
  deleteAIModel,
  getModelById
} from './queries';

// Re-export the getModelById function
export { getModelById };

// Server-side functions with direct database access
export async function getAllProviders(): Promise<ModelProvider[]> {
  try {
    console.log(`[${new Date().toISOString()}] Getting all providers from database`);
    return await getProviders();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error getting providers:`, error);
    console.log(`[${new Date().toISOString()}] Falling back to default providers`);
    return DEFAULT_PROVIDERS;
  }
}

export async function getAllCategories(): Promise<ModelCategory[]> {
  try {
    console.log(`[${new Date().toISOString()}] Getting all categories from database`);
    return await getCategories();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error getting categories:`, error);
    console.log(`[${new Date().toISOString()}] Falling back to default categories`);
    return DEFAULT_CATEGORIES;
  }
}

export async function getAllModels(): Promise<AIModel[]> {
  try {
    console.log(`[${new Date().toISOString()}] Getting all models from database`);
    const models = await getModels();
    
    // Get providers and categories for joining
    const providers = await getAllProviders();
    const categories = await getAllCategories();
    
    // Enhance models with provider and categories
    return models.map(model => {
      // Find provider
      const provider = providers.find(p => p.id === model.providerId);
      
      // Find categories
      const modelCategories = categories.filter(c =>
        model.categoryIds && model.categoryIds.includes(c.id)
      );
      
      return {
        ...model,
        // Joined fields
        provider: provider,
        categories: modelCategories
      };
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error getting models:`, error);
    console.log(`[${new Date().toISOString()}] Falling back to default models`);
    return DEFAULT_MODELS;
  }
}

export async function createCategory(category: Omit<ModelCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    console.log(`[${new Date().toISOString()}] Creating category in database: ${category.name}`);
    await createModelCategory(category);
    console.log(`[${new Date().toISOString()}] Category created successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error creating category:`, error);
    throw error;
  }
}

export async function createModel(model: Omit<AIModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    console.log(`[${new Date().toISOString()}] Creating model in database: ${model.displayName}`);
    await createAIModel(model);
    console.log(`[${new Date().toISOString()}] Model created successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error creating model:`, error);
    throw error;
  }
}

export async function updateModel(id: string, model: Partial<AIModel>): Promise<void> {
  try {
    console.log(`[${new Date().toISOString()}] Updating model in database: ${id}`);
    await updateAIModel(id, model);
    console.log(`[${new Date().toISOString()}] Model ${id} updated successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating model ${id}:`, error);
    throw error;
  }
}

export async function deleteModel(id: string): Promise<void> {
  try {
    console.log(`[${new Date().toISOString()}] Deleting model from database: ${id}`);
    await deleteAIModel(id);
    console.log(`[${new Date().toISOString()}] Model ${id} deleted successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting model ${id}:`, error);
    throw error;
  }
}

export async function deleteCategory(id: string): Promise<void> {
  try {
    console.log(`[${new Date().toISOString()}] Deleting category from database: ${id}`);
    
    // Import the deleteModelCategory function
    const { deleteModelCategory } = await import('./queries');
    
    // Delete the category
    await deleteModelCategory(id);
    
    console.log(`[${new Date().toISOString()}] Category ${id} deleted successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting category ${id}:`, error);
    throw error;
  }
}
