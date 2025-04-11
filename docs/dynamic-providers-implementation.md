# Dynamic Providers Implementation

This document provides the detailed implementation for the `dynamic-providers.ts` module, which creates custom providers based on database models, user API keys, and the Vercel AI SDK provider registry.

## File: `lib/ai/dynamic-providers.ts`

```typescript
import { customProvider, Provider } from 'ai';
import { getAllModels, getAllProviders, getAllCategories } from '../db/model-management';
import { getUserApiKeys } from '../db/user-api-keys';
import { myProvider } from './providers';
import { createProviderFromRegistry, getProvidersFromRegistry } from './provider-registry';
import { isFeatureEnabled } from '../feature-flags';

// Cache implementation
const MODEL_CACHE_TTL = 60 * 1000; // 1 minute
let providerCache: Provider | null = null;
let lastCacheUpdate = 0;

/**
 * Creates a custom provider based on database models, user API keys, and registry data
 * @param userId Optional user ID for API key lookup
 */
async function createDynamicProvider(userId?: string): Promise<Provider> {
  try {
    // Check if registry providers are enabled
    const registryEnabled = isFeatureEnabled('useProviderRegistry');
    
    // Load all data from database
    const [models, providers, categories, userApiKeys] = await Promise.all([
      getAllModels(),
      getAllProviders(),
      getAllCategories(),
      userId ? getUserApiKeys(userId) : []
    ]);
    
    // If registry is not enabled or we have no models, return default provider
    if (!registryEnabled || !models?.length) {
      console.log('Using default provider');
      return myProvider;
    }
    
    // Get registry providers
    const registryProviders = registryEnabled ? await getProvidersFromRegistry() : null;
    
    // Create language models map
    const languageModels: Record<string, any> = {};
    const imageModels: Record<string, any> = {};
    const audioModels: Record<string, any> = {};
    const videoModels: Record<string, any> = {};
    
    // Add models from database that have API keys
    for (const model of models) {
      if (!model.isEnabled) continue;
      
      // Check if this model's provider requires an API key
      const provider = providers.find(p => p.id === model.providerId);
      if (!provider) continue;
      
      // If provider requires API key, check if user has one
      if (provider.registryId && registryProviders) {
        const registryProvider = registryProviders[provider.registryId];
        const userApiKey = userApiKeys.find(key => key.providerId === provider.id);
        
        if (registryProvider) {
          // If provider requires API key and user has one, create provider instance
          if (userApiKey?.apiKey) {
            const providerInstance = await createProviderFromRegistry(
              provider.registryId,
              userApiKey.apiKey
            );
            
            if (providerInstance) {
              // Add model to appropriate map based on category type
              const category = categories.find(c => model.categoryIds.includes(c.id));
              if (category) {
                switch (category.type) {
                  case 'image':
                    if (providerInstance.imageModels?.[model.modelId]) {
                      imageModels[model.id] = providerInstance.imageModels[model.modelId];
                    }
                    break;
                  case 'audio':
                    if (providerInstance.audioModels?.[model.modelId]) {
                      audioModels[model.id] = providerInstance.audioModels[model.modelId];
                    }
                    break;
                  case 'video':
                    if (providerInstance.videoModels?.[model.modelId]) {
                      videoModels[model.id] = providerInstance.videoModels[model.modelId];
                    }
                    break;
                  default: // text
                    if (providerInstance.languageModels?.[model.modelId]) {
                      languageModels[model.id] = providerInstance.languageModels[model.modelId];
                    }
                    break;
                }
              }
            }
          }
        }
      }
    }
    
    // Merge with default provider for fallback
    return customProvider({
      languageModels: {
        ...myProvider.languageModels,
        ...languageModels
      },
      imageModels: {
        ...myProvider.imageModels,
        ...imageModels
      },
      audioModels: {
        ...audioModels
      },
      videoModels: {
        ...videoModels
      }
    });
  } catch (error) {
    console.error('Error creating dynamic provider:', error);
    
    // Log error for admin
    console.debug('Database error, falling back to default provider');
    
    // Return default provider
    return myProvider;
  }
}

/**
 * Gets the dynamic provider with caching
 * @param userId Optional user ID for API key lookup
 */
export async function getDynamicProvider(userId?: string): Promise<Provider> {
  const now = Date.now();

  // Check if we need to refresh cache
  if (!providerCache || now - lastCacheUpdate > MODEL_CACHE_TTL) {
    providerCache = await createDynamicProvider(userId);
    lastCacheUpdate = now;
  }
  
  return providerCache;
}

/**
 * Refreshes the provider cache immediately
 * @param userId Optional user ID for API key lookup
 */
export async function refreshModelCache(userId?: string): Promise<Provider> {
  lastCacheUpdate = 0;
  providerCache = null;
  return await getDynamicProvider(userId);
}

/**
 * Gets a list of all available models from the dynamic provider
 * This is useful for debugging and admin interfaces
 * @param userId Optional user ID for API key lookup
 */
export async function getAvailableModels(userId?: string): Promise<Record<string, string[]>> {
  const provider = await getDynamicProvider(userId);
  
  return {
    languageModels: Object.keys(provider.languageModels || {}),
    imageModels: Object.keys(provider.imageModels || {}),
    audioModels: Object.keys(provider.audioModels || {}),
    videoModels: Object.keys(provider.videoModels || {})
  };
}

/**
 * Checks if a specific model is available in the dynamic provider
 * @param modelId The model ID to check
 * @param userId Optional user ID for API key lookup
 */
export async function isModelAvailable(modelId: string, userId?: string): Promise<boolean> {
  const provider = await getDynamicProvider(userId);
  
  return !!(
    provider.languageModels?.[modelId] ||
    provider.imageModels?.[modelId] ||
    provider.audioModels?.[modelId] ||
    provider.videoModels?.[modelId]
  );
}
```

## Integration with Provider Registry

The `dynamic-providers.ts` module integrates with the `provider-registry.ts` module to create a custom provider that includes models from all available providers. Here's how they work together:

1. The `dynamic-providers.ts` module gets registry providers from the `provider-registry.ts` module.
2. It then checks which providers the user has API keys for.
3. For each provider with an API key, it creates a provider instance using the `createProviderFromRegistry` function.
4. It then extracts models from each provider instance and adds them to the custom provider.

## User API Key Integration

The `dynamic-providers.ts` module integrates with the user API key system to create provider instances with the user's API keys:

1. It gets the user's API keys from the database.
2. It matches API keys with providers.
3. It creates provider instances with the appropriate API keys.

## Caching Strategy

The `dynamic-providers.ts` module uses a caching strategy to minimize database queries and provider creation:

1. The custom provider is cached in memory for 1 minute.
2. The cache can be manually refreshed through the `refreshModelCache` function.
3. The cache is automatically refreshed when it expires.

## Error Handling

The `dynamic-providers.ts` module includes robust error handling to ensure that failures in provider creation don't affect the rest of the application:

1. All provider creation is wrapped in try/catch blocks.
2. Errors are logged for debugging.
3. The default provider is used as a fallback when errors occur.

## Feature Flag Integration

The `dynamic-providers.ts` module integrates with the feature flag system to enable or disable registry providers:

1. It checks if the `useProviderRegistry` feature flag is enabled.
2. If the flag is disabled, it returns the default provider.
3. If the flag is enabled, it creates a custom provider with registry providers.

## Performance Considerations

The `dynamic-providers.ts` module includes performance optimizations to minimize the impact of provider creation:

1. Caching is used to minimize database queries and provider creation.
2. Provider creation is only performed when necessary.
3. The cache TTL is configurable to balance freshness and performance.