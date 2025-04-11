import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { testProviderApiKey } from './ai/provider-registry';

// Define the UserApiKey table schema
// This is a temporary solution until we add it to the main schema
interface UserApiKey extends Record<string, unknown> {
  id: string;
  userId: string;
  providerId: string;
  apiKey: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Create DB connection
// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * Get all API keys for a user
 * @param userId The user ID
 */
export async function getUserApiKeys(userId: string): Promise<UserApiKey[]> {
  try {
    const result = await db.execute<UserApiKey>(
      sql`SELECT * FROM "UserApiKey" WHERE "userId" = ${userId}`
    );
    
    return result as UserApiKey[];
  } catch (error) {
    console.error('Failed to get user API keys:', error);
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
    const result = await db.execute<UserApiKey>(
      sql`SELECT * FROM "UserApiKey" WHERE "userId" = ${userId} AND "providerId" = ${providerId} LIMIT 1`
    );
    
    return (result as UserApiKey[]).length > 0 ? (result as UserApiKey[])[0] : null;
  } catch (error) {
    console.error('Failed to get user API key for provider:', error);
    return null;
  }
}

/**
 * Set API key for a provider
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
    // Get provider name from database
    const providerResult = await db.execute<{ name: string }>(
      sql`SELECT "name" FROM "ModelProvider" WHERE "id" = ${providerId} LIMIT 1`
    );
    
    if ((providerResult as any[]).length === 0) {
      console.error(`Provider with ID ${providerId} not found`);
      return null;
    }
    
    const providerName = (providerResult as { name: string }[])[0].name;
    
    // Test the API key
    const isValid = await testProviderApiKey(providerName, apiKey);
    
    if (!isValid) {
      console.error(`Invalid API key for provider ${providerName}`);
      return null;
    }
    
    // Check if API key already exists
    const existingKey = await getUserApiKeyForProvider(userId, providerId);
    
    if (existingKey) {
      // Update existing API key
      const result = await db.execute<UserApiKey>(
        sql`UPDATE "UserApiKey" SET "apiKey" = ${apiKey}, "isEnabled" = true, "updatedAt" = now() 
            WHERE "userId" = ${userId} AND "providerId" = ${providerId} RETURNING *`
      );
      
      return (result as UserApiKey[]).length > 0 ? (result as UserApiKey[])[0] : null;
    } else {
      // Insert new API key
      const result = await db.execute<UserApiKey>(
        sql`INSERT INTO "UserApiKey" ("userId", "providerId", "apiKey", "isEnabled", "createdAt", "updatedAt")
            VALUES (${userId}, ${providerId}, ${apiKey}, true, now(), now()) RETURNING *`
      );
      
      return (result as UserApiKey[]).length > 0 ? (result as UserApiKey[])[0] : null;
    }
  } catch (error) {
    console.error('Failed to set user API key:', error);
    return null;
  }
}

/**
 * Delete API key for a provider
 * @param userId The user ID
 * @param providerId The provider ID
 */
export async function deleteUserApiKey(
  userId: string,
  providerId: string
): Promise<boolean> {
  try {
    const result = await db.execute(
      sql`DELETE FROM "UserApiKey" WHERE "userId" = ${userId} AND "providerId" = ${providerId} RETURNING "id"`
    );
    
    return (result as any[]).length > 0;
  } catch (error) {
    console.error('Failed to delete user API key:', error);
    return false;
  }
}

/**
 * Enable or disable API key for a provider
 * @param userId The user ID
 * @param providerId The provider ID
 * @param isEnabled Whether the API key is enabled
 */
export async function setUserApiKeyEnabled(
  userId: string,
  providerId: string,
  isEnabled: boolean
): Promise<boolean> {
  try {
    const result = await db.execute(
      sql`UPDATE "UserApiKey" SET "isEnabled" = ${isEnabled}, "updatedAt" = now() 
          WHERE "userId" = ${userId} AND "providerId" = ${providerId} RETURNING "id"`
    );
    
    return (result as any[]).length > 0;
  } catch (error) {
    console.error('Failed to update user API key enabled status:', error);
    return false;
  }
}

/**
 * Get all providers that the user has API keys for
 * @param userId The user ID
 */
export async function getUserProviders(userId: string): Promise<string[]> {
  try {
    const result = await db.execute<{ name: string }>(
      sql`SELECT p."name" FROM "UserApiKey" k
          JOIN "ModelProvider" p ON k."providerId" = p."id"
          WHERE k."userId" = ${userId} AND k."isEnabled" = true`
    );
    
    return (result as { name: string }[]).map(row => row.name);
  } catch (error) {
    console.error('Failed to get user providers:', error);
    return [];
  }
}