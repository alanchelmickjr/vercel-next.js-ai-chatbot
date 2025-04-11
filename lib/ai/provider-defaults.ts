/**
 * Provider Defaults Module
 * Contains all constants and utility functions for the provider system
 * Serves as the central location for all default values
 */

import { DEFAULT_CATEGORIES, DEFAULT_PROVIDERS, DEFAULT_MODELS } from '../db/model-management-types';

// Cache TTL values
export const CACHE_TTL = {
  registry: 24 * 60 * 60 * 1000,  // 24 hours
  user: 60 * 60 * 1000,          // 1 hour
  creation: 500                   // 500ms debounce
} as const;

// Environment key patterns
export const ENV_PATTERNS = {
  apiKey: (name: string) => `${name.toUpperCase()}_API_KEY`,
  baseUrl: (name: string) => `${name.toUpperCase()}_BASE_URL`,
  region: (name: string) => `${name.toUpperCase()}_REGION`
} as const;

// Provider configuration defaults
export const PROVIDER_DEFAULTS = {
  maxTokens: 100000,
  temperature: 0.7,
  topP: 0.95,
  frequencyPenalty: 0,
  presencePenalty: 0
} as const;

// Thinking configuration defaults
export const THINKING_DEFAULTS = {
  type: 'enabled',
  budgetTokens: 32000
} as const;

/**
 * Gets the environment variable key for a provider
 */
export function getProviderEnvKey(name: string): string | undefined {
  return process.env[ENV_PATTERNS.apiKey(name)];
}

/**
 * Gets the base URL for a provider
 */
export function getProviderBaseUrl(name: string): string | undefined {
  return process.env[ENV_PATTERNS.baseUrl(name)];
}

/**
 * Gets the region for a provider
 */
export function getProviderRegion(name: string): string | undefined {
  return process.env[ENV_PATTERNS.region(name)];
}

/**
 * Loads model data from default values
 * Used when database access is not available
 */
export async function loadDefaultModels(userId?: string, requestId?: string) {
  try {
    const providers = DEFAULT_PROVIDERS;
    const categories = DEFAULT_CATEGORIES;
    const models = DEFAULT_MODELS;

    if (!providers?.length || !categories?.length || !models?.length) {
      return { providers: [], categories: [], models: [] };
    }

    return { providers, categories, models };
  } catch {
    return { providers: [], categories: [], models: [] };
  }
}