/**
 * Memory Schema
 * 
 * Purpose: Define the database schema for memory items
 * 
 * This module provides:
 * - Database table definition for memory items
 * - SQL migration script for creating the memory_items table
 */

import { pgTable, serial, uuid, text, varchar, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Memory Items Table
 * 
 * Stores persistent memory items for users
 * - Task memories (short-term)
 * - Day memories (medium-term)
 * - Curated memories (long-term)
 */
export const memoryItems = pgTable('memory_items', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  content: text('content').notNull(),
  memoryType: varchar('memory_type', { length: 20 }).notNull(), // 'task', 'day', or 'curated'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
  metadata: text('metadata')
}, (table) => {
  return {
    userIdIdx: index('memory_items_user_id_idx').on(table.userId),
    memoryTypeIdx: index('memory_items_memory_type_idx').on(table.memoryType),
    expiresAtIdx: index('memory_items_expires_at_idx').on(table.expiresAt)
  };
});

/**
 * SQL Migration Script
 * 
 * Creates the memory_items table in the database
 */
export const memoryItemsMigration = `
CREATE TABLE IF NOT EXISTS memory_items (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  memory_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS memory_items_user_id_idx ON memory_items(user_id);
CREATE INDEX IF NOT EXISTS memory_items_memory_type_idx ON memory_items(memory_type);
CREATE INDEX IF NOT EXISTS memory_items_expires_at_idx ON memory_items(expires_at);
`;