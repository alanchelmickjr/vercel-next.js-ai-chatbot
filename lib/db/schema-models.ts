import { pgTable, uuid, text, boolean, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const providerRegistry = pgTable('ProviderRegistry', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  displayName: text('displayName').notNull(),
  description: text('description'),
  logoUrl: text('logoUrl'),
  authType: text('authType').notNull(),
  modelTypes: text('modelTypes').array(),
  isEnabled: boolean('isEnabled').default(true),
  requiresApiKey: boolean('requiresApiKey').default(true),
  registryData: jsonb('registryData'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow()
});

export const modelProvider = pgTable('ModelProvider', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  logoUrl: text('logoUrl'),
  apiConfigKey: text('apiConfigKey').notNull(),
  isEnabled: boolean('isEnabled').default(true),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
  registryId: text('registryId'),
  registryData: jsonb('registryData')
});

export const modelCategory = pgTable('ModelCategory', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull().unique(),
  type: text('type').notNull(), // Any valid category type (dynamically extensible)
  description: text('description'),
  order: integer('order').default(0),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow()
});

export const aiModel = pgTable('AIModel', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: uuid('providerId').notNull().references(() => modelProvider.id, { onDelete: 'cascade' }),
  categoryIds: uuid('categoryIds').array(), // Array of category IDs
  modelId: text('modelId').notNull(),
  displayName: text('displayName').notNull(),
  description: text('description'),
  contextLength: integer('contextLength'),
  capabilities: text('capabilities').array(),
  isEnabled: boolean('isEnabled').default(true),
  isPrimary: boolean('isPrimary').default(false),
  pricing: jsonb('pricing'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow()
});
