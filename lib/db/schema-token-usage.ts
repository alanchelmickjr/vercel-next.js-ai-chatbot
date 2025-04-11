/**
 * Token Usage Schema
 * 
 * Purpose: Define database schema for token usage tracking
 * 
 * This module provides:
 * - Database table definitions for token usage
 * - Indexes for efficient querying
 * - Types for token usage records
 */

import { pgTable, serial, uuid, varchar, integer, timestamp, index, decimal } from 'drizzle-orm/pg-core';

/**
 * Token Usage Table
 * 
 * Stores token usage data for AI requests, including:
 * - User identification
 * - Model and provider information
 * - Token counts (input, output, total)
 * - Cost information
 * - Timestamp and metadata
 */
export const tokenUsage = pgTable('token_usage', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  modelId: varchar('model_id', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  totalTokens: integer('total_tokens').notNull(),
  cost: decimal('cost', { precision: 10, scale: 6 }).notNull(), // Stored in dollars with 6 decimal places
  subscriptionTier: varchar('subscription_tier', { length: 50 }).notNull(),
  metadata: varchar('metadata', { length: 1000 })
}, (table) => {
  return {
    userIdIdx: index('token_usage_user_id_idx').on(table.userId),
    modelIdIdx: index('token_usage_model_id_idx').on(table.modelId),
    timestampIdx: index('token_usage_timestamp_idx').on(table.timestamp),
    providerIdx: index('token_usage_provider_idx').on(table.provider),
    subscriptionTierIdx: index('token_usage_subscription_tier_idx').on(table.subscriptionTier)
  };
});

/**
 * Token Usage Summary Table
 * 
 * Stores aggregated token usage data for reporting and analytics:
 * - Daily, weekly, and monthly summaries
 * - Per-user, per-model, and per-provider breakdowns
 */
export const tokenUsageSummary = pgTable('token_usage_summary', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  period: varchar('period', { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly'
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  modelId: varchar('model_id', { length: 100 }),
  provider: varchar('provider', { length: 50 }),
  totalRequests: integer('total_requests').notNull(),
  totalInputTokens: integer('total_input_tokens').notNull(),
  totalOutputTokens: integer('total_output_tokens').notNull(),
  totalTokens: integer('total_tokens').notNull(),
  totalCost: decimal('total_cost', { precision: 10, scale: 6 }).notNull(),
  subscriptionTier: varchar('subscription_tier', { length: 50 }).notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => {
  return {
    userIdPeriodIdx: index('token_usage_summary_user_period_idx').on(table.userId, table.period),
    periodStartIdx: index('token_usage_summary_period_start_idx').on(table.periodStart),
    providerIdx: index('token_usage_summary_provider_idx').on(table.provider),
    subscriptionTierIdx: index('token_usage_summary_subscription_tier_idx').on(table.subscriptionTier)
  };
});

// Types
export type TokenUsage = typeof tokenUsage.$inferSelect;
export type NewTokenUsage = typeof tokenUsage.$inferInsert;

// SQL for creating the tables
export const createTokenUsageTableSQL = `
CREATE TABLE IF NOT EXISTS token_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  model_id VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cost DECIMAL(10, 6) NOT NULL,
  subscription_tier VARCHAR(50) NOT NULL,
  metadata VARCHAR(1000)
);

CREATE INDEX IF NOT EXISTS token_usage_user_id_idx ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS token_usage_model_id_idx ON token_usage(model_id);
CREATE INDEX IF NOT EXISTS token_usage_timestamp_idx ON token_usage(timestamp);
CREATE INDEX IF NOT EXISTS token_usage_provider_idx ON token_usage(provider);
CREATE INDEX IF NOT EXISTS token_usage_subscription_tier_idx ON token_usage(subscription_tier);

CREATE TABLE IF NOT EXISTS token_usage_summary (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  period VARCHAR(20) NOT NULL,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  model_id VARCHAR(100),
  provider VARCHAR(50),
  total_requests INTEGER NOT NULL,
  total_input_tokens INTEGER NOT NULL,
  total_output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  total_cost DECIMAL(10, 6) NOT NULL,
  subscription_tier VARCHAR(50) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS token_usage_summary_user_period_idx ON token_usage_summary(user_id, period);
CREATE INDEX IF NOT EXISTS token_usage_summary_period_start_idx ON token_usage_summary(period_start);
CREATE INDEX IF NOT EXISTS token_usage_summary_provider_idx ON token_usage_summary(provider);
CREATE INDEX IF NOT EXISTS token_usage_summary_subscription_tier_idx ON token_usage_summary(subscription_tier);
`;