/**
 * Database Queries Index
 * 
 * This module serves as the main entry point for all database query functions.
 * It re-exports all functions from the specialized query modules to provide
 * a unified API for database operations.
 */

// Re-export all functions from specialized query modules
export * from './user-auth';
export * from './chat';
export * from './documents';
export * from './model-management';
export * from './prompt-suggestions';
export * from './user-prompt-history';

// Re-export rating functions from the rating-functions module
export { ratePromptSuggestion, getTopRatedPromptSuggestions } from '../rating-functions';