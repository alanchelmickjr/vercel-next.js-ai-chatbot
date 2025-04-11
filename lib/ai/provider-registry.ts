/**
 * Provider Registry Module
 * Manages AI provider registration and access through the Vercel AI SDK
 * Serves as the single source of truth for all provider definitions
 * Includes Redis-based caching for persistence across server restarts
 */

// Set to false to disable debug logging
const DEBUG = false;

import { customProvider, createProviderRegistry as createBaseProviderRegistry, wrapLanguageModel, defaultSettingsMiddleware, extractReasoningMiddleware, Provider, LanguageModel, EmbeddingModel, ImageModel } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { mistral } from '@ai-sdk/mistral';
import { google as googleai } from '@ai-sdk/google';
import { xai } from '@ai-sdk/xai';
import { deepseek } from '@ai-sdk/deepseek';
import { cerebras } from '@ai-sdk/cerebras';
import { groq } from '@ai-sdk/groq';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { togetherai } from '@ai-sdk/togetherai';
import { azure } from '@ai-sdk/azure';
import { cohere } from '@ai-sdk/cohere';
import { fireworks } from '@ai-sdk/fireworks';
import { deepinfra } from '@ai-sdk/deepinfra';
import { perplexity } from '@ai-sdk/perplexity';
import { AnthropicProviderOptions } from './types';
import { cacheGet, cacheSet, cacheDelete, KEY_PREFIX, CACHE_EXPIRY } from '../vercel-kv/client';
import { CACHE_TTL } from './provider-defaults';

// Redis-based caching is used instead of in-memory Maps
// This provides persistence across server restarts and shared cache across instances

// Create custom providers with aliases
const openaiProvider = customProvider({
  languageModels: {
    'gpt-4o': openai('gpt-4o', { structuredOutputs: true }),
    'gpt-4o-mini': openai('gpt-4o-mini', { structuredOutputs: true }),
    'gpt-4-turbo': openai('gpt-4-turbo'),
    'quick': openai('gpt-4o-mini'),
    'complete': openai('gpt-4o'),
    'creative': openai('gpt-4o'),
    'title-model': openai('gpt-3.5-turbo')
  },
  textEmbeddingModels: {
    'text-embedding-3-small': openai.textEmbeddingModel('text-embedding-3-small'),
    'text-embedding-3-large': openai.textEmbeddingModel('text-embedding-3-large'),
    'embed': openai.textEmbeddingModel('text-embedding-3-small'),
    'embed-large': openai.textEmbeddingModel('text-embedding-3-large')
  },
  imageModels: {
    'dall-e-3': openai.imageModel('dall-e-3'),
    'image': openai.imageModel('dall-e-3')
  }
});

const anthropicProvider = customProvider({
  languageModels: {
    'opus': anthropic('claude-3-opus-20240229') as any,
    'sonnet': anthropic('claude-3-5-sonnet-20240620') as any,
    'haiku': anthropic('claude-3-haiku-20240307') as any,
    'writing': anthropic('claude-3-7-sonnet-20250219') as any,
    'creative': anthropic('claude-3-7-sonnet-20250219') as any,
    'title-model': anthropic('claude-3-5-sonnet-latest') as any,
    
    // Extended reasoning model with thinking capability
    'reasoning': wrapLanguageModel({
      model: anthropic('claude-3-7-sonnet-20250219') as any,
      middleware: [defaultSettingsMiddleware({
        settings: {
          maxTokens: 100000,
          providerMetadata: {
            anthropic: {
              thinking: {
                type: 'enabled',
                budgetTokens: 32000,
              },
            } as AnthropicProviderOptions,
          },
        },
      }), extractReasoningMiddleware({ tagName: 'think' })]
    })
  }
});

// Define the providers object
const providers: Record<string, any> = {
  // Core providers
  openai: openaiProvider,
  anthropic: anthropicProvider,
  mistral: customProvider({
    languageModels: {
      'mistral-large': mistral('mistral-large-latest') as any,
      'mistral-medium': mistral('mistral-medium-latest') as any,
      'mistral-small': mistral('mistral-small-latest') as any
    }
  }),
  googleai: customProvider({
    languageModels: {
      'gemini-1.5-pro': googleai('gemini-1.5-pro') as any,
      'gemini-1.5-flash': googleai('gemini-1.5-flash') as any
    }
  }),
  xai: customProvider({
    languageModels: {
      'grok-2': xai('grok-2-1212') as any
    }
  }),
  deepseek: customProvider({
    languageModels: {
      'deepseek-reasoner': deepseek('deepseek-reasoner') as any
    }
  }),
  cerebras: customProvider({
    languageModels: {
      'llama3.1-70b': cerebras('llama3.1-70b') as any
    }
  }),
  groq: customProvider({
    languageModels: {
      'llama-3.3-70b': groq('llama-3.3-70b-versatile') as any,
      'llama-3.1-8b': groq('llama-3.1-8b-instant') as any,
      'quick': groq('llama-3.1-8b-instant') as any,
      'complete': groq('llama-3.3-70b-versatile') as any,
      'creative': groq('llama-3.3-70b-versatile') as any
    }
  }),
  
  // Additional providers from provider-factory
  togetherai: customProvider({
    languageModels: {
      'llama-3.1-8b': togetherai('llama-3.1-8b') as any,
      'llama-3.1-70b': togetherai('llama-3.1-70b') as any,
      'deepseek-coder': togetherai('deepseek-coder') as any,
      'deepseek-r1': togetherai('deepseek-r1') as any,
      'deepseek-distill-r1': togetherai('deepseek-distill-r1') as any,
      'quick': togetherai('llama-3.1-8b') as any,
      'complete': togetherai('llama-3.1-70b') as any,
      'creative': togetherai('deepseek-r1') as any
    },
    imageModels: {
      'flux': togetherai.imageModel('flux') as any,
      'image': togetherai.imageModel('flux') as any
    }
  }),
  azure,
  cohere: customProvider({
    languageModels: {
      'command-r': cohere('command-r') as any,
      'command-r-plus': cohere('command-r-plus') as any,
      'quick': cohere('command-r') as any,
      'complete': cohere('command-r-plus') as any,
      'creative': cohere('command-r-plus') as any
    },
    textEmbeddingModels: {
      'embed-english-v3.0': cohere.textEmbeddingModel('embed-english-v3.0') as any,
      'embed-multilingual-v3.0': cohere.textEmbeddingModel('embed-multilingual-v3.0') as any,
      'embed': cohere.textEmbeddingModel('embed-english-v3.0') as any,
      'embed-large': cohere.textEmbeddingModel('embed-multilingual-v3.0') as any
    }
  }),
  fireworks: customProvider({
    languageModels: {
      'llama-3.1-70b': fireworks('llama-3.1-70b-instruct') as any,
      'llama-3.1-8b': fireworks('llama-3.1-8b-instruct') as any,
      'mixtral-8x7b': fireworks('mixtral-8x7b-instruct') as any,
      'quick': fireworks('llama-3.1-8b-instruct') as any,
      'complete': fireworks('llama-3.1-70b-instruct') as any,
      'creative': fireworks('mixtral-8x7b-instruct') as any
    }
  }),
  deepinfra,
  perplexity,
  
  // OpenAI compatible providers
  lmstudio: createOpenAICompatible({
    name: 'lmstudio',
    baseURL: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
  }),
  baseten: createOpenAICompatible({
    name: 'baseten',
    baseURL: process.env.BASETEN_BASE_URL || 'https://app.baseten.co/api/v1',
    apiKey: process.env.BASETEN_API_KEY,
  }),
  
  // Placeholder providers
  ollama: {},
  chromeai: {},
  friendliai: {},
  portkey: {},
  workersai: {},
  openrouter: {},
  crosshatch: {},
  mixedbread: {},
  voyageai: {},
  mem0: {},
  spark: {},
  anthropicvertex: {},
  langdb: {}
};

// Create a synchronous registry for compatibility with Vercel AI SDK
// but use async functions internally for Redis operations
export const registry = (() => {
  // Create the base Vercel registry - make it accessible for direct use
  const baseRegistry = createBaseProviderRegistry(providers);
  
  // Create our enhanced registry with the same interface
  const enhancedRegistry = {
    // Override the languageModel method to add alias resolution
    languageModel: (modelKey: string) => {
      // Check if it's a single-word alias
      if (!modelKey.includes(':')) {
        // For single-word aliases, we'll use the in-memory map for now
        // since we can't do async operations here
        const resolvedKey = categoryModelMap.get(modelKey);
        if (!resolvedKey) {
          throw new Error(`No mapping found for alias: ${modelKey}`);
        }
        return baseRegistry.languageModel(resolvedKey as `${string}:${string}`);
      }
      
      // Otherwise, pass through to the base registry
      return baseRegistry.languageModel(modelKey as `${string}:${string}`);
    },
    
    // Similarly extend other methods
    imageModel: (modelKey: string) => {
      // Handle alias resolution
      if (!modelKey.includes(':')) {
        // For single-word aliases, we'll use the in-memory map for now
        const resolvedKey = categoryModelMap.get(modelKey);
        if (!resolvedKey) {
          throw new Error(`No mapping found for alias: ${modelKey}`);
        }
        return baseRegistry.imageModel(resolvedKey as `${string}:${string}`);
      }
      return baseRegistry.imageModel(modelKey as `${string}:${string}`);
    },
    
    textEmbeddingModel: (modelKey: string) => {
      // Handle alias resolution
      if (!modelKey.includes(':')) {
        // For single-word aliases, we'll use the in-memory map for now
        const resolvedKey = categoryModelMap.get(modelKey);
        if (!resolvedKey) {
          throw new Error(`No mapping found for alias: ${modelKey}`);
        }
        return baseRegistry.textEmbeddingModel(resolvedKey as `${string}:${string}`);
      }
      return baseRegistry.textEmbeddingModel(modelKey as `${string}:${string}`);
    },
    
    // Add new capabilities that could be adopted by Vercel
    videoModel: (modelKey: string) => {
      // Implement video model support
      let resolvedModelKey = modelKey;
      
      if (!modelKey.includes(':')) {
        // For single-word aliases, we'll use the in-memory map for now
        const resolvedKey = categoryModelMap.get(modelKey);
        if (!resolvedKey) {
          throw new Error(`No mapping found for alias: ${modelKey}`);
        }
        resolvedModelKey = resolvedKey;
      }
      
      // Extract provider and model ID
      const [providerName, modelId] = resolvedModelKey.split(':');
      
      // Handle based on provider
      switch (providerName) {
        case 'luma':
          // Implement Luma Dream Machine support
          throw new Error(`Luma video model support not yet implemented`);
        case 'togetherai':
          // Implement TogetherAI video model support
          throw new Error(`TogetherAI video model support not yet implemented`);
        default:
          throw new Error(`Unsupported video model provider: ${providerName}`);
      }
    }
  };
  
  // Return our enhanced registry
  return enhancedRegistry;
})();

/**
 * Get the category for a model ID
 * This performs a reverse lookup in the categoryModelMap
 *
 * @param modelId The model ID in provider:model format
 * @returns The category name or null if not found
 */
export function getCategoryForModel(modelId: string): string | null {
  // Iterate through the categoryModelMap to find the category for this model
  for (const [category, mappedModelId] of categoryModelMap.entries()) {
    if (mappedModelId === modelId) {
      // Check if this is one of our primary categories
      if (category === 'quick' || category === 'complete' || category === 'creative' ||
          category === 'vision-quick' || category === 'vision-complete' || category === 'vision-creative') {
        // Return the simplified category name (without vision- prefix)
        return category.replace('vision-', '');
      }
    }
  }
  
  // If no direct match, check if it's a vision model
  const isVision = modelId.toLowerCase().includes('vision');
  
  // Try to determine category based on provider defaults
  const [provider] = modelId.split(':');
  
  if (provider === 'anthropic') {
    // Check if it matches any of the anthropic models in the categoryModelMap
    const anthropicQuick = categoryModelMap.get(isVision ? 'vision-quick' : 'quick');
    const anthropicComplete = categoryModelMap.get(isVision ? 'vision-complete' : 'complete');
    const anthropicCreative = categoryModelMap.get(isVision ? 'vision-creative' : 'creative');
    
    if (anthropicQuick === modelId) return 'quick';
    if (anthropicComplete === modelId) return 'complete';
    if (anthropicCreative === modelId) return 'creative';
  } else if (provider === 'openai') {
    // Check if it matches any of the openai models in the categoryModelMap
    const openaiQuick = categoryModelMap.get(isVision ? 'vision-quick' : 'quick');
    const openaiComplete = categoryModelMap.get(isVision ? 'vision-complete' : 'complete');
    const openaiCreative = categoryModelMap.get(isVision ? 'vision-creative' : 'creative');
    
    if (openaiQuick === modelId) return 'quick';
    if (openaiComplete === modelId) return 'complete';
    if (openaiCreative === modelId) return 'creative';
  }
  
  // No category found
  return null;
}

/**
 * Helper function to resolve aliases to provider:modelId format
 * Uses Redis cache for persistence
 * 
 * @param alias The alias to resolve
 * @returns The resolved provider:modelId string
 */
async function resolveAlias(alias: string): Promise<string> {
  // Check our Redis cache first
  const cacheKey = `${alias}`;
  const cachedEntry = await cacheGet<string>(cacheKey, { namespace: KEY_PREFIX.ALIAS_RESOLUTION });
  
  if (cachedEntry) {
    return cachedEntry;
  }
  
  // Otherwise, look up the alias in our mapping
  const resolvedKey = categoryModelMap.get(alias);
  
  if (!resolvedKey) {
    throw new Error(`No mapping found for alias: ${alias}`);
  }
  
  // Cache the result in Redis
  await cacheSet(cacheKey, resolvedKey, { 
    namespace: KEY_PREFIX.ALIAS_RESOLUTION,
    expiry: CACHE_EXPIRY.ALIAS_RESOLUTION
  });
  
  return resolvedKey;
}

// Category to model mapping for external categories that don't directly map to provider tags
export const categoryModelMap = new Map<string, string>();

/**
 * Load category mappings from database
 * This should be called during application initialization
 */
export async function loadCategoryMappingsFromDB() {
  try {
    // Clear existing mappings
    categoryModelMap.clear();
    
    // Import the default data from model-management-types.ts
    const { DEFAULT_CATEGORIES, DEFAULT_PROVIDERS, DEFAULT_MODELS } = await import('../db/model-management-types');
    
    // Use the default data directly
    const categories = DEFAULT_CATEGORIES;
    const providers = DEFAULT_PROVIDERS;
    const models = DEFAULT_MODELS;
    
    // Process each category
    for (const category of categories) {
      // Find default model for this category
      const defaultModel = models.find(model =>
        model.categoryIds.includes(category.id) && model.isPrimary
      );
      
      if (defaultModel && defaultModel.providerId) {
        // Find the provider for this model
        const provider = providers.find(p => p.id === defaultModel.providerId);
        
        if (provider) {
          const mapping = `${provider.name}:${defaultModel.modelId}`;
          
          // Map both the category ID and name
          categoryModelMap.set(category.id, mapping);
          categoryModelMap.set(category.name, mapping);
          
          // Also map simplified names (without prefixes)
          if (category.name.includes('-quick')) categoryModelMap.set('quick', mapping);
          if (category.name.includes('-complete')) categoryModelMap.set('complete', mapping);
          if (category.name.includes('-creative')) categoryModelMap.set('creative', mapping);
        }
      }
    }
  } catch (error) {
    console.error(`Error loading category mappings:`, error);
    
    // Initialize with default mappings as fallback
    initializeDefaultCategoryModelMap();
  }
}

// Initialize the category-to-model map with defaults
// This will be used as fallback if DB loading fails
function initializeDefaultCategoryModelMap() {
  // Text categories (defaulting to most common use cases)
  categoryModelMap.set('chat-model-quick', 'openai:quick');
  categoryModelMap.set('chat-model-complete', 'openai:complete');
  categoryModelMap.set('chat-model-creative', 'anthropic:creative');
  categoryModelMap.set('title-model', 'openai:title-model');
  categoryModelMap.set('artifact-model', 'openai:gpt-4o-mini');
  
  // Image categories
  categoryModelMap.set('small-model', 'openai:image');
  categoryModelMap.set('large-model', 'openai:image');
  categoryModelMap.set('real-time-model', 'togetherai:flux');
  
  // Embedding categories
  categoryModelMap.set('embed-model-small', 'openai:embed');
  categoryModelMap.set('embed-model-large', 'openai:embed-large');
  
  // Video categories
  categoryModelMap.set('video-model', 'togetherai:flux');
  
  // Also map simplified names
  categoryModelMap.set('quick', 'openai:quick');
  categoryModelMap.set('complete', 'openai:complete');
  categoryModelMap.set('creative', 'anthropic:creative');
  categoryModelMap.set('embed', 'openai:embed');
  categoryModelMap.set('title', 'openai:title-model');
  categoryModelMap.set('artifact', 'openai:gpt-4o-mini');
  categoryModelMap.set('tag', 'anthropic:creative');
  categoryModelMap.set('prompt-gen', 'anthropic:creative');
  categoryModelMap.set('video', 'togetherai:flux');
  
  // Code-related models
  categoryModelMap.set('code-model-quick', 'openai:quick');
  categoryModelMap.set('code-model-complete', 'openai:complete');
  categoryModelMap.set('code-model-creative', 'anthropic:creative');
  
  // Vision-related models
  categoryModelMap.set('vision-model-quick', 'openai:quick');
  categoryModelMap.set('vision-model-complete', 'openai:complete');
  categoryModelMap.set('vision-model-creative', 'anthropic:creative');
  
  // JSON-related models
  categoryModelMap.set('json-model-small', 'openai:quick');
  categoryModelMap.set('json-model-large', 'openai:complete');
  
  // Logprobs model
  categoryModelMap.set('logprobs-model', 'openai:complete');
  
  // Audio-related models
  categoryModelMap.set('transcription-model', 'openai:quick');
  categoryModelMap.set('tts-model', 'openai:quick');
}

// Initialize the mapping with defaults
initializeDefaultCategoryModelMap();

/**
 * Get a provider by name with Redis caching
 * 
 * @param providerName The name of the provider
 * @returns The provider instance
 */
export const getProvider = async (providerName: string) => {
  // Get provider from providers object
  const provider = providers[providerName];
  
  if (!provider) {
    throw new Error(`Provider not found: ${providerName}`);
  }
  
  return provider;
};

/**
 * Clear all Redis caches for the provider registry
 * @param userId Optional user ID to clear only user-specific entries
 */
export const clearAllCaches = async (userId?: string) => {
  // TODO: Implement proper Redis cache clearing
};

// For backward compatibility
export const clearProviderCache = clearAllCaches;

/**
 * Get all providers from registry
 * @param userId Optional user ID for user-specific access
 * @returns Object with provider names as keys and provider instances as values
 */
export const getProvidersFromRegistry = async (userId?: string) => {
  try {
    // Return the providers object
    return providers;
  } catch (error) {
    console.error(`Error getting providers from registry:`, error);
    return {};
  }
};

/**
 * Enhanced languageModel function that accepts category names or provider:model format
 * Uses Redis caching for persistence across server restarts
 *
 * @param categoryOrModelId The category name or provider:model identifier
 * @param userId Optional user ID for user-specific models
 * @returns The language model instance
 */
export async function enhancedLanguageModel(categoryOrModelId: string, userId?: string): Promise<LanguageModel> {
  // Check if this is a category mapped to a provider:model
  let modelKey = categoryOrModelId;
  if (categoryModelMap.has(categoryOrModelId)) {
    const mappedModel = categoryModelMap.get(categoryOrModelId)!;
    modelKey = mappedModel;
  }
  
  try {
    let model: LanguageModel;
    
    // Check if it's in provider:model format
    if (modelKey.includes(':')) {
      const [providerName, modelId] = modelKey.split(':');
      
      // Special case for 'creative' category with non-anthropic providers
      if (modelId === 'creative' && providerName !== 'anthropic') {
        // For non-anthropic providers, map 'creative' to their best model
        if (providerName === 'openai') {
          return enhancedLanguageModel('openai:gpt-4o');
        } else if (providerName === 'mistral') {
          return enhancedLanguageModel('mistral:mistral-large');
        } else if (providerName === 'googleai') {
          return enhancedLanguageModel('googleai:gemini-1.5-pro');
        }
      }
      
      // Get the provider
      const provider = providers[providerName];
      if (!provider) {
        throw new Error(`Provider not found: ${providerName}`);
      }
      
      // Use the baseRegistry directly instead of the enhanced registry to avoid recursion
      const baseRegistry = createBaseProviderRegistry(providers);
      model = baseRegistry.languageModel(`${providerName}:${modelId}` as `${string}:${string}`);
    } else {
      // If not in provider:model format, need to handle differently
      // Default to openai provider if no provider specified
      
      // Use the baseRegistry directly instead of the enhanced registry to avoid recursion
      const baseRegistry = createBaseProviderRegistry(providers);
      model = baseRegistry.languageModel(`openai:${modelKey}` as `${string}:${string}`);
    }
    
    return model;
  } catch (error) {
    console.error(`Error getting language model ${modelKey}:`, error);
    
    // Fallback to a default model if available
    if (modelKey !== 'openai:gpt-4o-mini') {
      // Create a new instance directly instead of recursively calling enhancedLanguageModel
      const baseRegistry = createBaseProviderRegistry(providers);
      return baseRegistry.languageModel('openai:gpt-4o-mini');
    }
    
    throw error;
  }
}

/**
 * Enhanced imageModel function that accepts category names or provider:model format
 * Uses Redis caching for persistence across server restarts
 *
 * @param categoryOrModelId The category name or provider:model identifier
 * @param userId Optional user ID for user-specific models
 * @returns The image model instance
 */
export async function enhancedImageModel(categoryOrModelId: string, userId?: string): Promise<ImageModel> {
  // Check if this is a category mapped to a provider:model
  let modelKey = categoryOrModelId;
  if (categoryModelMap.has(categoryOrModelId)) {
    const mappedModel = categoryModelMap.get(categoryOrModelId)!;
    modelKey = mappedModel;
  }
  
  try {
    let model: ImageModel;
    
    // Check if it's in provider:model format
    if (modelKey.includes(':')) {
      const [providerName, modelId] = modelKey.split(':');
      
      // Get the provider
      const provider = providers[providerName];
      if (!provider) {
        throw new Error(`Provider not found: ${providerName}`);
      }
      
      // Use the baseRegistry directly instead of the enhanced registry to avoid recursion
      const baseRegistry = createBaseProviderRegistry(providers);
      model = baseRegistry.imageModel(`${providerName}:${modelId}` as `${string}:${string}`);
    } else {
      // If not in provider:model format, need to handle differently
      // Default to openai provider if no provider specified
      
      // Use the baseRegistry directly instead of the enhanced registry to avoid recursion
      const baseRegistry = createBaseProviderRegistry(providers);
      model = baseRegistry.imageModel(`openai:${modelKey}` as `${string}:${string}`);
    }
    
    return model;
  } catch (error) {
    console.error(`Error getting image model ${modelKey}:`, error);
    
    // Fallback to a default model if available
    if (modelKey !== 'openai:image') {
      // Create a new instance directly instead of recursively calling enhancedImageModel
      const baseRegistry = createBaseProviderRegistry(providers);
      return baseRegistry.imageModel('openai:image');
    }
    
    throw error;
  }
}

/**
 * Enhanced textEmbeddingModel function that accepts category names or provider:model format
 * Uses Redis caching for persistence across server restarts
 *
 * @param categoryOrModelId The category name or provider:model identifier
 * @param userId Optional user ID for user-specific models
 * @returns The embedding model instance
 */
export async function enhancedTextEmbeddingModel(categoryOrModelId: string, userId?: string): Promise<EmbeddingModel<string>> {
  // Check if this is a category mapped to a provider:model
  let modelKey = categoryOrModelId;
  if (categoryModelMap.has(categoryOrModelId)) {
    const mappedModel = categoryModelMap.get(categoryOrModelId)!;
    modelKey = mappedModel;
  }
  
  try {
    let model: EmbeddingModel<string>;
    
    // Check if it's in provider:model format
    if (modelKey.includes(':')) {
      const [providerName, modelId] = modelKey.split(':');
      
      // Get the provider
      const provider = providers[providerName];
      if (!provider) {
        throw new Error(`Provider not found: ${providerName}`);
      }
      
      // Use the baseRegistry directly instead of the enhanced registry to avoid recursion
      const baseRegistry = createBaseProviderRegistry(providers);
      model = baseRegistry.textEmbeddingModel(`${providerName}:${modelId}` as `${string}:${string}`);
    } else {
      // If not in provider:model format, need to handle differently
      // Default to openai provider if no provider specified
      
      // Use the baseRegistry directly instead of the enhanced registry to avoid recursion
      const baseRegistry = createBaseProviderRegistry(providers);
      model = baseRegistry.textEmbeddingModel(`openai:${modelKey}` as `${string}:${string}`);
    }
    
    return model;
  } catch (error) {
    console.error(`Error getting embedding model ${modelKey}:`, error);
    
    // Fallback to a default model if available
    if (modelKey !== 'openai:embed') {
      // Create a new instance directly instead of recursively calling enhancedTextEmbeddingModel
      const baseRegistry = createBaseProviderRegistry(providers);
      return baseRegistry.textEmbeddingModel('openai:embed');
    }
    
    throw error;
  }
}

/**
 * Update the category-to-model mapping
 * This can be called when user preferences change or when new models are added
 *
 * @param categoryKey The category ID or name
 * @param providerModelString The provider:model string
 */
export async function updateCategoryMapping(categoryKey: string, providerModelString: string) {
  categoryModelMap.set(categoryKey, providerModelString);
  
  // Clear related Redis cache entries
  await cacheDelete(categoryKey, { namespace: KEY_PREFIX.ALIAS_RESOLUTION });
  
  // If this is a common alias, update those too
  if (categoryKey.includes('-quick')) {
    categoryModelMap.set('quick', providerModelString);
    await cacheDelete('quick', { namespace: KEY_PREFIX.ALIAS_RESOLUTION });
  }
  if (categoryKey.includes('-complete')) {
    categoryModelMap.set('complete', providerModelString);
    await cacheDelete('complete', { namespace: KEY_PREFIX.ALIAS_RESOLUTION });
  }
  if (categoryKey.includes('-creative')) {
    categoryModelMap.set('creative', providerModelString);
    await cacheDelete('creative', { namespace: KEY_PREFIX.ALIAS_RESOLUTION });
  }
  
  // Reload all mappings from database to ensure consistency
  await loadCategoryMappingsFromDB();
}

/**
 * Test if a provider API key is valid
 * @param providerName The name of the provider
 * @param apiKey The API key to test
 * @returns True if the API key is valid, false otherwise
 */
export const testProviderApiKey = async (providerName: string, apiKey: string): Promise<boolean> => {
  try {
    // For now, just check if the API key is not empty
    return !!apiKey && apiKey.trim() !== '';
  } catch (error) {
    console.error(`Error testing provider API key:`, error);
    return false;
  }
};

/**
 * Get the environment variable value for a provider
 * @param providerName The name of the provider
 * @returns The environment variable value for the provider's API key
 */
export const getProviderEnvKey = (providerName: string): string => {
  const envKey = `${providerName.toUpperCase()}_API_KEY`;
  return process.env[envKey] || '';
};

// Initialize the registry by loading mappings from the database
// This should be called during application startup

// Track initialization state to avoid redundant loading
let isInitialized = false;

export async function initializeRegistry() {
  // Skip if already initialized
  if (isInitialized) {
    return;
  }
  
  try {
    await loadCategoryMappingsFromDB();
    isInitialized = true;
  } catch (error) {
    console.error(`Error initializing registry:`, error);
  }
}
