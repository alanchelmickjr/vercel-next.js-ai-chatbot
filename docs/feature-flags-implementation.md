# Feature Flags Implementation

This document provides the detailed implementation for the feature flags system, which allows for gradual rollout of new features like the Vercel AI SDK provider registry integration.

## File: `lib/feature-flags.ts`

```typescript
/**
 * Feature flag definition
 */
export interface FeatureFlag {
  name: string;
  description: string;
  enabled: boolean;
  enabledForUsers?: string[]; // User IDs for which this flag is enabled
  enabledForGroups?: string[]; // User groups for which this flag is enabled
  rolloutPercentage?: number; // Percentage of users for which this flag is enabled (0-100)
}

/**
 * Feature flags configuration
 * These flags control the availability of features in the application
 */
const featureFlags: Record<string, FeatureFlag> = {
  // Provider Registry Features
  useProviderRegistry: {
    name: 'Use Provider Registry',
    description: 'Enable Vercel AI SDK provider registry integration',
    enabled: true,
    rolloutPercentage: 100
  },
  showAllProviders: {
    name: 'Show All Providers',
    description: 'Show all available providers in the UI',
    enabled: true,
    rolloutPercentage: 100
  },
  
  // Model Type Features
  enableImageModels: {
    name: 'Enable Image Models',
    description: 'Enable image generation models',
    enabled: true,
    rolloutPercentage: 100
  },
  enableVideoModels: {
    name: 'Enable Video Models',
    description: 'Enable video generation models',
    enabled: false,
    rolloutPercentage: 0
  },
  enableAudioModels: {
    name: 'Enable Audio Models',
    description: 'Enable audio generation models',
    enabled: false,
    rolloutPercentage: 0
  },
  
  // UI Features
  showModelPreferencesGear: {
    name: 'Show Model Preferences Gear',
    description: 'Show the gear icon for accessing model preferences',
    enabled: true,
    rolloutPercentage: 100
  },
  showApiKeyManagement: {
    name: 'Show API Key Management',
    description: 'Show the API key management UI in model preferences',
    enabled: true,
    rolloutPercentage: 100
  },
  
  // Admin Features
  enableModelManagement: {
    name: 'Enable Model Management',
    description: 'Enable the model management admin UI',
    enabled: true,
    enabledForGroups: ['admin']
  },
  enableProviderRefresh: {
    name: 'Enable Provider Refresh',
    description: 'Enable manual refresh of provider registry data',
    enabled: true,
    enabledForGroups: ['admin']
  }
};

/**
 * Check if a feature is enabled
 * @param flagName The name of the feature flag
 * @param userId Optional user ID for user-specific flags
 * @param userGroups Optional user groups for group-specific flags
 */
export function isFeatureEnabled(
  flagName: string,
  userId?: string,
  userGroups?: string[]
): boolean {
  const flag = featureFlags[flagName];
  if (!flag) return false;
  
  // Check if enabled for specific user
  if (userId && flag.enabledForUsers?.includes(userId)) {
    return true;
  }
  
  // Check if enabled for user group
  if (userGroups?.length && flag.enabledForGroups?.some(group => userGroups.includes(group))) {
    return true;
  }
  
  // Check rollout percentage if user ID is provided
  if (userId && typeof flag.rolloutPercentage === 'number') {
    // Use a hash of the user ID to determine if the feature is enabled
    // This ensures the same user always gets the same result for a given feature
    const hash = hashString(userId + flagName);
    const normalizedHash = hash % 100; // Convert hash to 0-99 range
    
    if (normalizedHash < flag.rolloutPercentage) {
      return true;
    }
    
    // If not in rollout percentage, fall back to global enabled flag
  }
  
  return flag.enabled;
}

/**
 * Get all feature flags
 * This is useful for admin interfaces
 */
export function getAllFeatureFlags(): Record<string, FeatureFlag> {
  return { ...featureFlags };
}

/**
 * Update a feature flag
 * This is useful for admin interfaces
 * @param flagName The name of the feature flag
 * @param updates The updates to apply to the flag
 */
export function updateFeatureFlag(
  flagName: string,
  updates: Partial<FeatureFlag>
): boolean {
  if (!featureFlags[flagName]) return false;
  
  featureFlags[flagName] = {
    ...featureFlags[flagName],
    ...updates
  };
  
  return true;
}

/**
 * Get feature flags for a specific user
 * This returns a map of flag names to boolean values
 * @param userId The user ID
 * @param userGroups Optional user groups
 */
export function getUserFeatureFlags(
  userId: string,
  userGroups?: string[]
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  
  for (const [flagName, flag] of Object.entries(featureFlags)) {
    result[flagName] = isFeatureEnabled(flagName, userId, userGroups);
  }
  
  return result;
}

/**
 * Simple string hash function
 * This is used to determine if a user is in the rollout percentage
 * @param str The string to hash
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Reset feature flags to default values
 * This is useful for testing
 */
export function resetFeatureFlags(): void {
  // This would typically load default values from a configuration file or database
  // For simplicity, we're just resetting the values in memory
  featureFlags.useProviderRegistry.enabled = true;
  featureFlags.showAllProviders.enabled = true;
  featureFlags.enableImageModels.enabled = true;
  featureFlags.enableVideoModels.enabled = false;
  featureFlags.enableAudioModels.enabled = false;
  featureFlags.showModelPreferencesGear.enabled = true;
  featureFlags.showApiKeyManagement.enabled = true;
  featureFlags.enableModelManagement.enabled = true;
  featureFlags.enableProviderRefresh.enabled = true;
}
```

## Feature Flag Usage

The feature flags system is designed to be used throughout the application to control the availability of features. Here are some examples of how to use it:

### In React Components

```tsx
import { isFeatureEnabled } from '@/lib/feature-flags';
import { useSession } from 'next-auth/react';

export function MyComponent() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const userGroups = session?.user?.groups || [];
  
  // Check if a feature is enabled for the current user
  const showApiKeyManagement = isFeatureEnabled('showApiKeyManagement', userId, userGroups);
  
  return (
    <div>
      {/* Only show this section if the feature is enabled */}
      {showApiKeyManagement && (
        <div>
          <h2>API Key Management</h2>
          {/* API key management UI */}
        </div>
      )}
    </div>
  );
}
```

### In API Routes

```typescript
import { NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/(auth)/auth.config';

export async function GET() {
  // Get user session
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const userGroups = session?.user?.groups || [];
  
  // Check if a feature is enabled for the current user
  const useProviderRegistry = isFeatureEnabled('useProviderRegistry', userId, userGroups);
  
  if (!useProviderRegistry) {
    return NextResponse.json(
      { error: 'Provider registry is disabled' },
      { status: 403 }
    );
  }
  
  // Feature is enabled, proceed with the request
  // ...
}
```

### In Server-Side Code

```typescript
import { isFeatureEnabled } from '@/lib/feature-flags';

export async function createDynamicProvider(userId?: string) {
  // Check if registry providers are enabled
  const registryEnabled = isFeatureEnabled('useProviderRegistry', userId);
  
  if (!registryEnabled) {
    // Registry is disabled, use default provider
    return defaultProvider;
  }
  
  // Registry is enabled, create dynamic provider
  // ...
}
```

## Feature Flag Administration

The feature flags system includes functions for administering feature flags, which can be used in admin interfaces:

1. `getAllFeatureFlags()` - Get all feature flags
2. `updateFeatureFlag()` - Update a feature flag
3. `resetFeatureFlags()` - Reset feature flags to default values

These functions can be used to create an admin interface for managing feature flags, allowing administrators to enable or disable features, adjust rollout percentages, and target specific users or groups.

## Rollout Strategy

The feature flags system supports a gradual rollout strategy through several mechanisms:

1. **Global Enabling/Disabling**: Features can be enabled or disabled globally.
2. **User-Specific Enabling**: Features can be enabled for specific users.
3. **Group-Specific Enabling**: Features can be enabled for specific user groups.
4. **Percentage Rollout**: Features can be rolled out to a percentage of users.

This allows for a controlled rollout of new features, with the ability to target specific users or groups for testing before enabling features for all users.

## Persistence

In a production environment, feature flags would typically be persisted in a database or configuration file. This implementation uses in-memory storage for simplicity, but could be extended to use a database or configuration file for persistence.

## Testing

The feature flags system includes a `resetFeatureFlags()` function for testing, which resets all feature flags to their default values. This is useful for ensuring that tests run with a consistent set of feature flags.