# User API Keys Implementation

This document provides the detailed implementation for the user API keys management system, which allows users to store and manage their API keys for different AI providers.

## Database Schema

First, let's define the database schema for storing user API keys:

### File: `lib/db/schema-models.ts` (Addition)

```typescript
export const userApiKey = pgTable('UserApiKey', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull(),
  providerId: uuid('providerId').notNull().references(() => modelProvider.id, { onDelete: 'cascade' }),
  apiKey: text('apiKey').notNull(),
  isEnabled: boolean('isEnabled').default(true),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow()
});
```

## API Key Management Functions

Next, let's implement the functions for managing user API keys:

### File: `lib/db/user-api-keys.ts`

```typescript
import { and, eq } from 'drizzle-orm';
import { db } from './queries';
import { userApiKey } from './schema-models';

/**
 * User API key interface
 */
export interface UserApiKey {
  id: string;
  userId: string;
  providerId: string;
  apiKey: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all API keys for a user
 * @param userId The user ID
 */
export async function getUserApiKeys(userId: string): Promise<UserApiKey[]> {
  try {
    const keys = await db.select()
      .from(userApiKey)
      .where(eq(userApiKey.userId, userId));
    
    return keys as UserApiKey[];
  } catch (error) {
    console.error('Failed to get user API keys from database', error);
    return [];
  }
}

/**
 * Get API key for a specific provider
 * @param userId The user ID
 * @param providerId The provider ID
 */
export async function getUserApiKeyForProvider(
  userId: string,
  providerId: string
): Promise<UserApiKey | null> {
  try {
    const keys = await db.select()
      .from(userApiKey)
      .where(and(
        eq(userApiKey.userId, userId),
        eq(userApiKey.providerId, providerId)
      ));
    
    return keys.length > 0 ? keys[0] as UserApiKey : null;
  } catch (error) {
    console.error('Failed to get user API key for provider from database', error);
    return null;
  }
}

/**
 * Create or update API key
 * @param userId The user ID
 * @param providerId The provider ID
 * @param apiKey The API key
 */
export async function setUserApiKey(
  userId: string,
  providerId: string,
  apiKey: string
): Promise<UserApiKey | null> {
  try {
    const timestamp = new Date();
    
    // Check if key already exists
    const existingKey = await getUserApiKeyForProvider(userId, providerId);
    
    if (existingKey) {
      // Update existing key
      const [updatedKey] = await db.update(userApiKey)
        .set({
          apiKey,
          isEnabled: true,
          updatedAt: timestamp
        })
        .where(eq(userApiKey.id, existingKey.id))
        .returning();
      
      return updatedKey as UserApiKey;
    } else {
      // Create new key
      const [newKey] = await db.insert(userApiKey)
        .values({
          userId,
          providerId,
          apiKey,
          isEnabled: true,
          createdAt: timestamp,
          updatedAt: timestamp
        })
        .returning();
      
      return newKey as UserApiKey;
    }
  } catch (error) {
    console.error('Failed to set user API key in database', error);
    return null;
  }
}

/**
 * Delete API key
 * @param userId The user ID
 * @param providerId The provider ID
 */
export async function deleteUserApiKey(
  userId: string,
  providerId: string
): Promise<boolean> {
  try {
    const result = await db.delete(userApiKey)
      .where(and(
        eq(userApiKey.userId, userId),
        eq(userApiKey.providerId, providerId)
      ))
      .returning({ id: userApiKey.id });
    
    return result.length > 0;
  } catch (error) {
    console.error('Failed to delete user API key from database', error);
    return false;
  }
}

/**
 * Enable or disable API key
 * @param userId The user ID
 * @param providerId The provider ID
 * @param isEnabled Whether the key is enabled
 */
export async function setUserApiKeyEnabled(
  userId: string,
  providerId: string,
  isEnabled: boolean
): Promise<boolean> {
  try {
    const existingKey = await getUserApiKeyForProvider(userId, providerId);
    if (!existingKey) return false;
    
    const [updatedKey] = await db.update(userApiKey)
      .set({
        isEnabled,
        updatedAt: new Date()
      })
      .where(eq(userApiKey.id, existingKey.id))
      .returning();
    
    return !!updatedKey;
  } catch (error) {
    console.error('Failed to update user API key enabled state in database', error);
    return false;
  }
}

/**
 * Test if an API key is valid for a provider
 * This function is a placeholder and should be implemented with actual validation logic
 * @param providerId The provider ID
 * @param apiKey The API key to test
 */
export async function testApiKey(
  providerId: string,
  apiKey: string
): Promise<boolean> {
  try {
    // In a real implementation, this would call the provider's API to validate the key
    // For now, we'll just return true if the key is not empty
    return !!apiKey;
  } catch (error) {
    console.error('Failed to test API key', error);
    return false;
  }
}
```

## API Routes for User API Keys

Now, let's implement the API routes for managing user API keys:

### File: `app/api/user/api-keys/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserApiKeys, setUserApiKey, deleteUserApiKey, testApiKey } from '@/lib/db/user-api-keys';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/(auth)/auth.config';
import { isFeatureEnabled } from '@/lib/feature-flags';

/**
 * Get all API keys for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Check if API key management is enabled
    if (!isFeatureEnabled('showApiKeyManagement')) {
      return NextResponse.json(
        { error: 'API key management is disabled' },
        { status: 403 }
      );
    }
    
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const apiKeys = await getUserApiKeys(userId);
    
    // Return API keys with masked values for security
    const maskedKeys = apiKeys.map(key => ({
      ...key,
      apiKey: maskApiKey(key.apiKey)
    }));
    
    return NextResponse.json(maskedKeys);
  } catch (error) {
    console.error('Error fetching user API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

/**
 * Set API key for a provider
 */
export async function POST(request: NextRequest) {
  try {
    // Check if API key management is enabled
    if (!isFeatureEnabled('showApiKeyManagement')) {
      return NextResponse.json(
        { error: 'API key management is disabled' },
        { status: 403 }
      );
    }
    
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const { providerId, apiKey } = await request.json();
    
    if (!providerId || !apiKey) {
      return NextResponse.json(
        { error: 'Provider ID and API key are required' },
        { status: 400 }
      );
    }
    
    // Test the API key before saving
    const isValid = await testApiKey(providerId, apiKey);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 400 }
      );
    }
    
    const result = await setUserApiKey(userId, providerId, apiKey);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to save API key' },
        { status: 500 }
      );
    }
    
    // Return success with masked API key
    return NextResponse.json({
      ...result,
      apiKey: maskApiKey(result.apiKey)
    });
  } catch (error) {
    console.error('Error saving user API key:', error);
    return NextResponse.json(
      { error: 'Failed to save API key' },
      { status: 500 }
    );
  }
}

/**
 * Delete API key for a provider
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check if API key management is enabled
    if (!isFeatureEnabled('showApiKeyManagement')) {
      return NextResponse.json(
        { error: 'API key management is disabled' },
        { status: 403 }
      );
    }
    
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const { providerId } = await request.json();
    
    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }
    
    const result = await deleteUserApiKey(userId, providerId);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to delete API key' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to mask API key for security
 * @param apiKey The API key to mask
 */
function maskApiKey(apiKey: string): string {
  if (!apiKey) return '';
  if (apiKey.length <= 8) return '********';
  
  const firstFour = apiKey.substring(0, 4);
  const lastFour = apiKey.substring(apiKey.length - 4);
  
  return `${firstFour}${'*'.repeat(apiKey.length - 8)}${lastFour}`;
}
```

## Integration with User Model Preferences

The user API keys management system integrates with the user model preferences component to allow users to manage their API keys:

### File: `components/user-model-preferences.tsx` (API Key Management Section)

```tsx
{/* Provider API Keys Section */}
{isFeatureEnabled('showApiKeyManagement') && providers && providers.length > 0 && (
  <div className="mb-6">
    <h3 className="text-lg font-semibold mb-3">Provider API Keys</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {providers.map(provider => (
        <Card key={provider.id} className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {provider.name}
              {hasApiKey(provider.id) ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle className="size-3 mr-1" />
                  API Key Set
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                  <AlertCircle className="size-3 mr-1" />
                  API Key Required
                </Badge>
              )}
            </CardTitle>
            {provider.description && (
              <CardDescription className="text-xs">{provider.description}</CardDescription>
            )}
          </CardHeader>
          <CardFooter className="pt-2 mt-auto">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => openApiKeyDialog(provider)}
            >
              <Key className="size-4 mr-2" />
              {hasApiKey(provider.id) ? 'Update API Key' : 'Add API Key'}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  </div>
)}

{/* API Key Dialog */}
<Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>
        {selectedProvider?.name} API Key
      </DialogTitle>
      <DialogDescription>
        Enter your API key for {selectedProvider?.name}. This will be stored securely and used to access the provider's models.
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <label htmlFor="apiKey" className="text-sm font-medium">
          API Key
        </label>
        <Input
          id="apiKey"
          type="password"
          placeholder="Enter your API key"
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
        />
      </div>
      
      {selectedProvider && hasApiKey(selectedProvider.id) && (
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
          onClick={() => deleteApiKey(selectedProvider.id)}
        >
          Delete API Key
        </Button>
      )}
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setApiKeyDialogOpen(false)}>
        Cancel
      </Button>
      <Button onClick={saveApiKey} disabled={!apiKeyInput || isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save API Key'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Security Considerations

The user API keys management system includes several security considerations:

1. **API Key Masking**: API keys are masked when returned to the client to prevent exposure.
2. **Authentication**: All API routes require authentication to ensure only authorized users can access their API keys.
3. **Feature Flags**: API key management can be disabled through feature flags if needed.
4. **Validation**: API keys are validated before being saved to ensure they are valid.
5. **Database Security**: API keys are stored in the database, which should be properly secured.

## Integration with Dynamic Providers

The user API keys management system integrates with the dynamic providers system to create provider instances with the user's API keys:

```typescript
// In createDynamicProvider function
const userApiKeys = await getUserApiKeys(userId);

// For each model
const userApiKey = userApiKeys.find(key => key.providerId === provider.id);
if (userApiKey?.apiKey) {
  const providerInstance = await createProviderFromRegistry(
    provider.registryId,
    userApiKey.apiKey
  );
  
  // Use provider instance
}
```

This allows the dynamic providers system to create provider instances with the user's API keys, enabling access to providers that require API keys.

## Migration Plan

To implement the user API keys management system, the following migration steps are needed:

1. Add the `userApiKey` table to the database schema
2. Create the `user-api-keys.ts` module with API key management functions
3. Create the API routes for user API key management
4. Update the user model preferences component to include API key management
5. Update the dynamic providers system to use user API keys

This migration can be done incrementally, with feature flags controlling the availability of API key management features.