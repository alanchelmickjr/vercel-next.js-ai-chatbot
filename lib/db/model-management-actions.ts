'use server';

import {
  createModelCategory,
  deleteModelCategory,
  updateAIModel,
  deleteAIModel,
  getModelById,
  getModels,
  createAIModel
} from './queries/model-management';
import type { ModelCategory, AIModel } from './model-management-types';

/**
 * Server action to create a new model category
 * @param category The category to create
 */
export async function createModelCategoryAction(category: Omit<ModelCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    await createModelCategory(category);
  } catch (error) {
    console.error('Error creating category:', error);
    throw new Error('Failed to create category');
  }
}

/**
 * Server action to delete a model category
 * @param id The category ID
 */
export async function deleteModelCategoryAction(id: string): Promise<void> {
  try {
    await deleteModelCategory(id);
  } catch (error) {
    console.error('Error deleting category:', error);
    throw new Error('Failed to delete category');
  }
}

/**
 * Server action to update an AI model
 * @param id The model ID
 * @param model The partial model data to update
 */
export async function updateAIModelAction(id: string, model: Partial<AIModel>): Promise<void> {
  try {
    await updateAIModel(id, model);
  } catch (error) {
    console.error('Error updating model:', error);
    throw new Error('Failed to update model');
  }
}

/**
 * Server action to get all AI models
 * @returns All AI models
 */
export async function getModelsAction(): Promise<AIModel[]> {
  try {
    return await getModels();
  } catch (error) {
    console.error('Error getting models:', error);
    throw new Error('Failed to get models');
  }
}

/**
 * Server action to create a new AI model
 * @param model The model data to create
 */
export async function createAIModelAction(model: Omit<AIModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    await createAIModel(model);
  } catch (error) {
    console.error('Error creating model:', error);
    throw new Error('Failed to create model');
  }
}

/**
 * Server action to delete an AI model
 * @param id The model ID
 */
export async function deleteAIModelAction(id: string): Promise<void> {
  try {
    await deleteAIModel(id);
  } catch (error) {
    console.error('Error deleting model:', error);
    throw new Error('Failed to delete model');
  }
}

/**
 * Server action to get an AI model by ID
 * @param id The model ID
 * @returns The model or null if not found
 */
export async function getModelByIdAction(id: string): Promise<AIModel | null> {
  try {
    return await getModelById(id);
  } catch (error) {
    console.error('Error getting model:', error);
    throw new Error('Failed to get model');
  }
}