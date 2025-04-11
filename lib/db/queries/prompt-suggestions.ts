/**
 * Prompt Suggestions Database Functions
 * 
 * This module contains functions for managing prompt suggestions:
 * - Retrieving default and user-specific prompt suggestions
 * - Creating, updating, and deleting prompt suggestions
 * - Managing prompt suggestion visibility
 * - Retrieving public prompt suggestions for the marketplace
 */

import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

import { db } from '../connection';
import {
  promptSuggestion,
  type PromptSuggestion
} from '../schema-prompt-suggestions';

/**
 * Get default prompt suggestions
 * 
 * @returns Promise resolving to an array of default prompt suggestions
 */
export async function getDefaultPromptSuggestions() {
  try {
    return await db
      .select()
      .from(promptSuggestion)
      .where(and(
        eq(promptSuggestion.isDefault, true),
        eq(promptSuggestion.isActive, true)
      ));
  } catch (error) {
    console.error('Failed to get default prompt suggestions from database', error);
    throw error;
  }
}

/**
 * Get prompt suggestions for a specific user
 * 
 * @param userId - The ID of the user
 * @param limit - Maximum number of suggestions to retrieve (default: 10)
 * @returns Promise resolving to an array of prompt suggestions
 */
export async function getPromptSuggestionsByUserId({
  userId,
  limit = 10
}: {
  userId: string;
  limit?: number;
}) {
  try {
    return await db
      .select()
      .from(promptSuggestion)
      .where(and(
        eq(promptSuggestion.userId, userId),
        eq(promptSuggestion.isActive, true)
      ))
      .orderBy(desc(promptSuggestion.updatedAt))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get prompt suggestions by user id from database', error);
    throw error;
  }
}

/**
 * Save a new prompt suggestion
 * 
 * @param suggestion - The prompt suggestion to save
 * @returns Promise resolving to the result of the insert operation
 */
export async function savePromptSuggestion({
  suggestion,
}: {
  suggestion: Omit<PromptSuggestion, 'id' | 'createdAt' | 'updatedAt'>;
}) {
  try {
    return await db.insert(promptSuggestion).values({
      id: randomUUID(),
      userId: suggestion.userId,
      title: suggestion.title,
      label: suggestion.label,
      action: suggestion.action,
      complexPrompt: suggestion.complexPrompt,
      category: suggestion.category,
      isDefault: suggestion.isDefault,
      isActive: suggestion.isActive,
      ratingCount: suggestion.ratingCount || 0,
      ratingSum: suggestion.ratingSum || 0,
      averageRating: suggestion.averageRating || '0',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save prompt suggestion in database', error);
    throw error;
  }
}

/**
 * Save multiple prompt suggestions
 * 
 * @param suggestions - Array of prompt suggestions to save
 * @returns Promise resolving to the result of the insert operation
 */
export async function savePromptSuggestions({
  suggestions,
}: {
  suggestions: Array<Omit<PromptSuggestion, 'id' | 'createdAt' | 'updatedAt'>>;
}) {
  try {
    const values = suggestions.map((suggestion) => ({
      id: randomUUID(),
      userId: suggestion.userId,
      title: suggestion.title,
      label: suggestion.label,
      action: suggestion.action,
      complexPrompt: suggestion.complexPrompt,
      category: suggestion.category,
      isDefault: suggestion.isDefault,
      isActive: suggestion.isActive,
      ratingCount: suggestion.ratingCount || 0,
      ratingSum: suggestion.ratingSum || 0,
      averageRating: suggestion.averageRating || '0',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    return await db.insert(promptSuggestion).values(values);
  } catch (error) {
    console.error('Failed to save prompt suggestions in database', error);
    throw error;
  }
}

/**
 * Update an existing prompt suggestion
 * 
 * @param id - The ID of the prompt suggestion to update
 * @param suggestion - The updated prompt suggestion data
 * @returns Promise resolving to the result of the update operation
 */
export async function updatePromptSuggestion({
  id,
  suggestion,
}: {
  id: string;
  suggestion: Partial<PromptSuggestion>;
}) {
  try {
    return await db
      .update(promptSuggestion)
      .set({
        ...suggestion,
        updatedAt: new Date(),
      })
      .where(eq(promptSuggestion.id, id));
  } catch (error) {
    console.error('Failed to update prompt suggestion in database', error);
    throw error;
  }
}

/**
 * Delete a prompt suggestion
 * 
 * @param id - The ID of the prompt suggestion to delete
 * @returns Promise resolving to the result of the delete operation
 */
export async function deletePromptSuggestion({ id }: { id: string }) {
  try {
    return await db.delete(promptSuggestion).where(eq(promptSuggestion.id, id));
  } catch (error) {
    console.error('Failed to delete prompt suggestion from database', error);
    throw error;
  }
}

/**
 * Get prompt suggestions by category
 * 
 * @param category - The category name
 * @returns Promise resolving to an array of prompt suggestions for the category
 */
export async function getPromptSuggestionsByCategory({ category }: { category: string }) {
  try {
    return await db
      .select()
      .from(promptSuggestion)
      .where(and(
        eq(promptSuggestion.category, category),
        eq(promptSuggestion.isActive, true)
      ));
  } catch (error) {
    console.error('Failed to get prompt suggestions by category from database', error);
    throw error;
  }
}

/**
 * Get public prompt suggestions that can be shared in the marketplace
 * 
 * @param limit - Maximum number of suggestions to retrieve (default: 50)
 * @returns Promise resolving to an array of public prompt suggestions
 */
export async function getPublicPromptSuggestions(limit = 50) {
  try {
    return await db
      .select()
      .from(promptSuggestion)
      .where(and(
        eq(promptSuggestion.visibility, 'public'),
        eq(promptSuggestion.isActive, true)
      ))
      .orderBy(desc(promptSuggestion.updatedAt))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get public prompt suggestions from database', error);
    throw error;
  }
}

/**
 * Get public prompt suggestions by category for marketplace filtering
 * 
 * @param category - The category name
 * @param limit - Maximum number of suggestions to retrieve (default: 50)
 * @returns Promise resolving to an array of public prompt suggestions for the category
 */
export async function getPublicPromptSuggestionsByCategory({ category }: { category: string }, limit = 50) {
  try {
    return await db
      .select()
      .from(promptSuggestion)
      .where(and(
        eq(promptSuggestion.visibility, 'public'),
        eq(promptSuggestion.isActive, true),
        eq(promptSuggestion.category, category)
      ))
      .orderBy(desc(promptSuggestion.updatedAt))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get public prompt suggestions by category from database', error);
    throw error;
  }
}

/**
 * Update the visibility of a prompt suggestion
 * 
 * @param id - The ID of the prompt suggestion
 * @param visibility - The new visibility setting ('private' or 'public')
 * @returns Promise resolving to the result of the update operation
 */
export async function updatePromptSuggestionVisibility({
  id,
  visibility
}: {
  id: string;
  visibility: 'private' | 'public'
}) {
  try {
    return await db.update(promptSuggestion)
      .set({
        visibility,
        updatedAt: new Date()
      })
      .where(eq(promptSuggestion.id, id));
  } catch (error) {
    console.error('Failed to update prompt suggestion visibility in database', error);
    throw error;
  }
}