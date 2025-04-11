/**
 * Model Management Database Functions
 * 
 * This module contains functions for managing AI models, providers, and categories:
 * - Retrieving models, providers, and categories
 * - Creating new models, providers, and categories
 * - Updating and deleting models and categories
 */
// Server-only functionality
import 'server-only';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

import { db } from '../connection';
import {
  providerRegistry as providerRegistryTable,
  modelProvider as modelProviderTable,
  modelCategory as modelCategoryTable,
  aiModel as aiModelTable
} from '../schema-models';

// Import types from model-management.ts
import type { AIModel, ModelCategory, ModelProvider } from '../model-management-types';

/**
 * Get all model providers from the database
 * 
 * @returns Promise resolving to an array of model providers
 */
export async function getProviders(): Promise<ModelProvider[]> {
  try {
    console.log(`[${new Date().toISOString()}] Getting providers from database`);
    const dbProviders = await db.select().from(modelProviderTable);
    
    // Map database results to ModelProvider type
    return dbProviders.map(provider => ({
      id: provider.id,
      name: provider.name,
      description: provider.description || undefined,
      logoUrl: provider.logoUrl || undefined,
      apiConfigKey: provider.apiConfigKey,
      isEnabled: provider.isEnabled || true,
      createdAt: provider.createdAt || new Date(),
      updatedAt: provider.updatedAt || new Date()
    }));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error getting providers from database:`, error);
    // We'll handle the fallback in model-management.ts
    throw error;
  }
}

/**
 * Get all model categories from the database
 * 
 * @returns Promise resolving to an array of model categories
 */
export async function getCategories(): Promise<ModelCategory[]> {
  try {
    console.log(`[${new Date().toISOString()}] Getting categories from database`);
    const dbCategories = await db.select().from(modelCategoryTable);
    
    // Map database results to ModelCategory type
    return dbCategories.map(category => ({
      id: category.id,
      name: category.name,
      type: category.type, // No need for type casting since we're using string type
      description: category.description || undefined,
      order: category.order || 0,
      createdAt: category.createdAt || new Date(),
      updatedAt: category.updatedAt || new Date()
    }));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error getting categories from database:`, error);
    // We'll handle the fallback in model-management.ts
    throw error;
  }
}

/**
 * Get all AI models from the database
 * 
 * @returns Promise resolving to an array of AI models
 */
export async function getModels(): Promise<AIModel[]> {
  try {
    console.log(`[${new Date().toISOString()}] Getting models from database`);
    const dbModels = await db.select().from(aiModelTable);
    
    // Map database results to AIModel type
    return dbModels.map(model => ({
      id: model.id,
      providerId: model.providerId,
      categoryIds: model.categoryIds || [],
      modelId: model.modelId,
      displayName: model.displayName,
      description: model.description || undefined,
      contextLength: model.contextLength || undefined,
      capabilities: model.capabilities || [],
      isEnabled: model.isEnabled || true,
      isPrimary: model.isPrimary || false,
      pricing: model.pricing,
      createdAt: model.createdAt || new Date(),
      updatedAt: model.updatedAt || new Date()
    }));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error getting models from database:`, error);
    // We'll handle the fallback in model-management.ts
    throw error;
  }
}

/**
 * Create a new model provider in the database
 * 
 * @param provider - The provider data to create (without id, createdAt, updatedAt)
 * @returns Promise resolving to the result of the insert operation
 */
export async function createModelProvider(provider: Omit<ModelProvider, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    console.log(`[${new Date().toISOString()}] Creating provider in database:`, provider.name);
    // Generate a UUID for the provider
    const providerId = randomUUID();
    
    return await db.insert(modelProviderTable).values({
      id: providerId,
      name: provider.name,
      description: provider.description,
      logoUrl: provider.logoUrl,
      apiConfigKey: provider.apiConfigKey,
      isEnabled: provider.isEnabled,
      registryId: null,
      registryData: null
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error creating provider in database:`, error);
    throw error;
  }
}

/**
 * Create a new model category in the database
 * 
 * @param category - The category data to create (without id, createdAt, updatedAt)
 * @returns Promise resolving to the result of the insert operation
 */
export async function createModelCategory(category: Omit<ModelCategory, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    console.log(`[${new Date().toISOString()}] Creating category in database:`, category.name);
    // Generate a UUID for the category
    const categoryId = randomUUID();
    
    return await db.insert(modelCategoryTable).values({
      id: categoryId,
      name: category.name,
      type: category.type,
      description: category.description,
      order: category.order || 0
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error creating category in database:`, error);
    throw error;
  }
}

/**
 * Create a new AI model in the database
 * 
 * @param model - The model data to create (without id, createdAt, updatedAt)
 * @returns Promise resolving to the result of the insert operation
 */
export async function createAIModel(model: Omit<AIModel, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    console.log(`[${new Date().toISOString()}] Creating model in database:`, model.displayName);
    // Generate a UUID for the model
    const modelId = randomUUID();
    
    return await db.insert(aiModelTable).values({
      id: modelId,
      providerId: model.providerId,
      categoryIds: model.categoryIds,
      modelId: model.modelId,
      displayName: model.displayName,
      description: model.description,
      contextLength: model.contextLength,
      capabilities: model.capabilities,
      isEnabled: model.isEnabled,
      isPrimary: model.isPrimary,
      pricing: model.pricing
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error creating model in database:`, error);
    throw error;
  }
}

/**
 * Update an existing AI model in the database
 * 
 * @param id - The ID of the model to update
 * @param model - The partial model data to update
 * @returns Promise resolving to the result of the update operation
 */
export async function updateAIModel(id: string, model: Partial<AIModel>) {
  try {
    console.log(`[${new Date().toISOString()}] Updating model in database:`, id);
    return await db.update(aiModelTable)
      .set({
        providerId: model.providerId,
        categoryIds: model.categoryIds,
        modelId: model.modelId,
        displayName: model.displayName,
        description: model.description,
        contextLength: model.contextLength,
        capabilities: model.capabilities,
        isEnabled: model.isEnabled,
        isPrimary: model.isPrimary,
        pricing: model.pricing,
        updatedAt: new Date()
      })
      .where(eq(aiModelTable.id, id));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating model in database:`, error);
    throw error;
  }
}

/**
 * Delete an AI model from the database
 * 
 * @param id - The ID of the model to delete
 * @returns Promise resolving to the result of the delete operation
 */
export async function deleteAIModel(id: string) {
  try {
    console.log(`[${new Date().toISOString()}] Deleting model from database:`, id);
    return await db.delete(aiModelTable).where(eq(aiModelTable.id, id));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting model from database:`, error);
    throw error;
  }
}

/**
 * Delete a model category from the database
 * 
 * @param id - The ID of the category to delete
 * @returns Promise resolving to the result of the delete operation
 */
export async function deleteModelCategory(id: string) {
  try {
    console.log(`[${new Date().toISOString()}] Deleting category from database:`, id);
    return await db.delete(modelCategoryTable).where(eq(modelCategoryTable.id, id));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting category from database:`, error);
    throw error;
  }
}

/**
 * Get an AI model by ID from the database
 *
 * @param id - The ID of the model to retrieve
 * @returns Promise resolving to the model or null if not found
 */
export async function getModelById(id: string): Promise<AIModel | null> {
  try {
    console.log(`[${new Date().toISOString()}] Getting model by ID from database:`, id);
    const [model] = await db.select().from(aiModelTable).where(eq(aiModelTable.id, id)).limit(1);
    
    if (!model) {
      console.log(`[${new Date().toISOString()}] Model not found in database:`, id);
      return null;
    }
    
    // Get the provider for this model
    const [provider] = await db.select().from(modelProviderTable).where(eq(modelProviderTable.id, model.providerId)).limit(1);
    
    // Get the categories for this model
    const categories = model.categoryIds?.length
      ? await db.select().from(modelCategoryTable).where(
          model.categoryIds.map(categoryId => eq(modelCategoryTable.id, categoryId)).reduce((a, b) => a || b)
        )
      : [];
    
    // Map database result to AIModel type with joined fields
    return {
      id: model.id,
      providerId: model.providerId,
      categoryIds: model.categoryIds || [],
      modelId: model.modelId,
      displayName: model.displayName,
      description: model.description || undefined,
      contextLength: model.contextLength || undefined,
      capabilities: model.capabilities || [],
      isEnabled: model.isEnabled || true,
      isPrimary: model.isPrimary || false,
      pricing: model.pricing,
      createdAt: model.createdAt || new Date(),
      updatedAt: model.updatedAt || new Date(),
      // Joined fields
      provider: provider ? {
        id: provider.id,
        name: provider.name,
        description: provider.description || undefined,
        logoUrl: provider.logoUrl || undefined,
        apiConfigKey: provider.apiConfigKey,
        isEnabled: provider.isEnabled || true,
        createdAt: provider.createdAt || new Date(),
        updatedAt: provider.updatedAt || new Date()
      } : undefined,
      categories: categories.map(category => ({
        id: category.id,
        name: category.name,
        type: category.type,
        description: category.description || undefined,
        order: category.order || 0,
        createdAt: category.createdAt || new Date(),
        updatedAt: category.updatedAt || new Date()
      }))
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error getting model by ID from database:`, error);
    return null;
  }
}