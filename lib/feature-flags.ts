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
  },
  showAdminIcon: {
    name: 'Show Admin Icon',
    description: 'Show the admin icon in the header for accessing model manager',
    enabled: true, // Enabled during development
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
  featureFlags.showAdminIcon.enabled = true;
}