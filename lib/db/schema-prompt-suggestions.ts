import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  boolean,
  primaryKey,
  integer,
  decimal,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';
import { user } from './schema';

/**
 * PromptSuggestion table for storing suggested actions/prompts
 */
export const promptSuggestion = pgTable('PromptSuggestion', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  title: varchar('title', { length: 100 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  action: text('action').notNull(),
  // Complex prompt field for detailed instructions
  complexPrompt: text('complexPrompt'),
  category: varchar('category', { length: 50 }),
  visibility: varchar('visibility', { length: 20 }).notNull().default('private'),
  isDefault: boolean('isDefault').notNull().default(false),
  isActive: boolean('isActive').notNull().default(true),
  // Rating fields
  ratingCount: integer('ratingCount').notNull().default(0),
  ratingSum: integer('ratingSum').notNull().default(0),
  averageRating: decimal('averageRating', { precision: 3, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

/**
 * UserPromptHistory table for storing user's prompt history
 * Used for generating personalized suggestions
 */
export const userPromptHistory = pgTable('UserPromptHistory', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  prompt: text('prompt').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

// Type definitions
export type PromptSuggestion = InferSelectModel<typeof promptSuggestion>;
export type UserPromptHistory = InferSelectModel<typeof userPromptHistory>;