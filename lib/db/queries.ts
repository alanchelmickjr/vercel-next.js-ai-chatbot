/**
 * Database Queries Module
 * 
 * This file has been refactored into smaller, more focused modules for better maintainability.
 * It now re-exports all functions from the specialized query modules in the queries/ directory.
 * 
 * The refactored structure includes:
 * - connection.ts: Database connection setup
 * - queries/user-auth.ts: User authentication functions
 * - queries/chat.ts: Chat management functions
 * - queries/documents.ts: Document management functions
 * - queries/model-management.ts: Model management functions
 * - queries/prompt-suggestions.ts: Prompt suggestions system
 * - queries/user-prompt-history.ts: User prompt history functions
 * - queries/index.ts: Main export file that re-exports all functions
 */

// Re-export all functions from the queries/index.ts file
export * from './queries/index';
