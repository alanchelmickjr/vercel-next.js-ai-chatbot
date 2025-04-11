/**
 * Tool Management Database Schema
 * 
 * This module defines the schema for tool management tables:
 * - ToolCall: Tracks individual tool calls, their status, and results
 * - ToolPipeline: Tracks multi-step tool pipelines and their progress
 */

import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  integer
} from 'drizzle-orm/pg-core';

/**
 * ToolCall table schema
 * 
 * Tracks individual tool calls, their status, and results
 */
export const toolCall = pgTable('ToolCall', {
  id: text('id').primaryKey().notNull(),
  // userId field removed to match actual database schema
  chatId: text('chatId').notNull(),
  messageId: text('messageId').notNull(),
  toolName: text('toolName').notNull(),
  toolCallId: text('toolCallId').notNull(),
  args: jsonb('args').notNull(),
  status: text('status').notNull(), // 'pending', 'processing', 'completed', 'failed'
  result: jsonb('result'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  error: text('error'),
  retryCount: integer('retryCount').default(0),
  parentToolCallId: text('parentToolCallId'),
  pipelineId: text('pipelineId'),
  stepNumber: integer('stepNumber')
});

/**
 * ToolPipeline table schema
 * 
 * Tracks multi-step tool pipelines and their progress
 */
export const toolPipeline = pgTable('ToolPipeline', {
  id: text('id').primaryKey().notNull(),
  // userId field removed to match actual database schema
  chatId: text('chatId').notNull(),
  name: text('name').notNull(),
  status: text('status').notNull(), // 'pending', 'processing', 'completed', 'failed'
  currentStep: integer('currentStep').default(0),
  totalSteps: integer('totalSteps').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  metadata: jsonb('metadata')
});

// Type definitions for TypeScript type safety
export type ToolCall = InferSelectModel<typeof toolCall>;
export type ToolPipeline = InferSelectModel<typeof toolPipeline>;

// Status enum for type safety
export enum ToolStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  AWAITING_APPROVAL = 'awaiting_approval',
  REJECTED = 'rejected'
}

// System user IDs for system-initiated tools
export const SYSTEM_USER_IDS = {
  SYSTEM01: '00000000-0000-0000-0000-000000000001',
  SYSTEM02: '00000000-0000-0000-0000-000000000002',
  SYSTEM03: '00000000-0000-0000-0000-000000000003'
};