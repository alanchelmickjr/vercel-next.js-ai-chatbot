/**
 * User Prompt History Database Functions
 * 
 * This module contains functions for managing user prompt history:
 * - Retrieving user prompt history
 * - Saving new prompt history entries
 * - Pruning old prompt history entries
 */

import 'server-only';
import { and, desc, eq, lt } from 'drizzle-orm';
import { randomUUID } from 'crypto';

import { db } from '../connection';
import {
  userPromptHistory,
  type UserPromptHistory
} from '../schema-prompt-suggestions';

/**
 * Get prompt history for a specific user
 * 
 * @param userId - The ID of the user
 * @param limit - Maximum number of history items to retrieve (default: 20)
 * @returns Promise resolving to an array of user prompt history items
 */
export async function getUserPromptHistory({
  userId,
  limit = 20
}: {
  userId: string;
  limit?: number;
}) {
  try {
    return await db
      .select()
      .from(userPromptHistory)
      .where(eq(userPromptHistory.userId, userId))
      .orderBy(desc(userPromptHistory.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get prompt history by user id from database', error);
    throw error;
  }
}

/**
 * Save a prompt to user history
 * 
 * @param history - User prompt history item to save
 * @returns Promise resolving to the result of the insert operation
 */
export async function saveUserPromptHistory({
  history,
}: {
  history: Omit<UserPromptHistory, 'id' | 'createdAt'>;
}) {
  try {
    return await db.insert(userPromptHistory).values({
      id: randomUUID(),
      userId: history.userId,
      prompt: history.prompt,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save user prompt history in database', error);
    throw error;
  }
}

/**
 * Save multiple prompt history items
 * 
 * @param historyItems - Array of user prompt history items to save
 * @returns Promise resolving to the result of the insert operation
 */
export async function saveMultipleUserPromptHistory({
  historyItems,
}: {
  historyItems: Array<Omit<UserPromptHistory, 'id' | 'createdAt'>>;
}) {
  try {
    const values = historyItems.map((history) => ({
      id: randomUUID(),
      userId: history.userId,
      prompt: history.prompt,
      createdAt: new Date(),
    }));

    return await db.insert(userPromptHistory).values(values);
  } catch (error) {
    console.error('Failed to save multiple user prompt history items in database', error);
    throw error;
  }
}

/**
 * Delete old prompt history for a user
 * 
 * @param userId - The ID of the user
 * @param keepCount - Number of most recent history items to keep (default: 100)
 * @returns Promise resolving to the result of the delete operation
 */
export async function pruneUserPromptHistory({
  userId,
  keepCount = 100,
}: {
  userId: string;
  keepCount?: number;
}) {
  try {
    // Get the timestamp of the nth most recent history item
    const recentHistory = await db
      .select()
      .from(userPromptHistory)
      .where(eq(userPromptHistory.userId, userId))
      .orderBy(desc(userPromptHistory.createdAt))
      .limit(keepCount);

    if (recentHistory.length < keepCount) {
      // Not enough history to prune
      return;
    }

    const oldestToKeep = recentHistory[recentHistory.length - 1].createdAt;

    // Delete all history items older than the oldest to keep
    return await db
      .delete(userPromptHistory)
      .where(and(
        eq(userPromptHistory.userId, userId),
        lt(userPromptHistory.createdAt, oldestToKeep)
      ));
  } catch (error) {
    console.error('Failed to prune user prompt history from database', error);
    throw error;
  }
}