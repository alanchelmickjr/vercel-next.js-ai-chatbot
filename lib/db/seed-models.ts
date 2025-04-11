import { config } from 'dotenv';
import { randomUUID } from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  modelProvider as modelProviderTable,
  modelCategory as modelCategoryTable,
  aiModel as aiModelTable
} from './schema-models';
import {
  DEFAULT_PROVIDERS,
  DEFAULT_CATEGORIES,
  DEFAULT_MODELS
} from './model-management-types';

config({
  path: '.env.local',
});

const seedDatabase = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  const connection = postgres(process.env.POSTGRES_URL);
  const db = drizzle(connection);

  console.log('⏳ Seeding database with default models and categories...');

  try {
    // Flush existing data to ensure a clean slate
    console.log('🧹 Flushing existing data from database...');
    
    // Delete in reverse order to respect foreign key constraints
    console.log('Deleting existing models...');
    await db.delete(aiModelTable);
    
    console.log('Deleting existing categories...');
    await db.delete(modelCategoryTable);
    
    console.log('Deleting existing providers...');
    await db.delete(modelProviderTable);
    
    console.log('✅ Database flushed successfully');
    
    // Upsert providers
    console.log(`Upserting ${DEFAULT_PROVIDERS.length} providers...`);
    for (const provider of DEFAULT_PROVIDERS) {
      try {
        console.log(`Processing provider: ${provider.name} (${provider.id})`);
        
        // Include the new fields in the insert operation
        await db.insert(modelProviderTable)
          .values({
            id: provider.id, // Use predefined UUID from model-management-types.ts
            name: provider.name,
            description: provider.description,
            logoUrl: provider.logoUrl,
            apiConfigKey: provider.apiConfigKey,
            isEnabled: provider.isEnabled,
            registryId: null, // Add the new field with a default value
            registryData: null // Add the new field with a default value
          })
          .onConflictDoUpdate({
            target: modelProviderTable.name,
            set: {
              description: provider.description,
              logoUrl: provider.logoUrl,
              apiConfigKey: provider.apiConfigKey,
              isEnabled: provider.isEnabled,
              registryId: null,
              registryData: null,
              updatedAt: new Date()
            }
          });
          
        console.log(`✅ Provider ${provider.name} upserted successfully`);
      } catch (error) {
        console.error(`Failed to upsert provider ${provider.name}:`, error);
        // Log more details about the error
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        throw error;
      }
    }

    // Verify providers were inserted
    const insertedProviders = await db.select().from(modelProviderTable);
    console.log(`Found ${insertedProviders.length} providers in database`);
    
    // Log the actual providers in the database
    console.log('Providers in database:');
    insertedProviders.forEach(provider => {
      console.log(`  - ID: ${provider.id}, Name: ${provider.name}`);
    });
    
    if (insertedProviders.length < DEFAULT_PROVIDERS.length) {
      throw new Error(`Failed to insert all providers. Expected ${DEFAULT_PROVIDERS.length}, found ${insertedProviders.length}`);
    }

    // Upsert categories
    console.log(`Upserting ${DEFAULT_CATEGORIES.length} categories...`);
    for (const category of DEFAULT_CATEGORIES) {
      try {
        console.log(`Processing category: ${category.name} (${category.id})`);
        
        await db.insert(modelCategoryTable)
          .values({
            id: category.id, // Use the predefined ID instead of generating a new one
            name: category.name,
            type: category.type,
            description: category.description,
            order: category.order
          })
          .onConflictDoUpdate({
            target: modelCategoryTable.name,
            set: {
              type: category.type,
              description: category.description,
              order: category.order,
              updatedAt: new Date()
            }
          });
          
        console.log(`✅ Category ${category.name} upserted successfully`);
      } catch (error) {
        console.error(`Failed to upsert category ${category.name}:`, error);
        // Log more details about the error
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        throw error;
      }
    }

    // Verify categories were inserted
    const insertedCategories = await db.select().from(modelCategoryTable);
    console.log(`Found ${insertedCategories.length} categories in database`);
    if (insertedCategories.length < DEFAULT_CATEGORIES.length) {
      throw new Error(`Failed to insert all categories. Expected ${DEFAULT_CATEGORIES.length}, found ${insertedCategories.length}`);
    }

    // Create a map of provider names to their actual IDs in the database
    const providerNameToIdMap: Record<string, string> = {};
    insertedProviders.forEach(provider => {
      providerNameToIdMap[provider.name] = provider.id;
    });
    
    // Log the provider name to ID mapping
    console.log('Provider name to ID mapping:');
    Object.entries(providerNameToIdMap).forEach(([name, id]) => {
      console.log(`  - ${name}: ${id}`);
    });
    
    // Upsert models using provider IDs from the database
    console.log(`Upserting ${DEFAULT_MODELS.length} models...`);
    for (const model of DEFAULT_MODELS) {
      try {
        console.log(`Processing model: ${model.displayName} (${model.id})`);
        
        // Get the provider name from the model using the provider map
        // This map should be kept in sync with DEFAULT_PROVIDERS in model-management-types.ts
        const providerMap: Record<string, string> = {
          '550e8400-e29b-41d4-a716-446655440000': 'openai',
          '550e8400-e29b-41d4-a716-446655440001': 'anthropic',
          '550e8400-e29b-41d4-a716-446655440002': 'togetherai',
          '550e8400-e29b-41d4-a716-446655440003': 'cohere'
        };
        
        const providerName = providerMap[model.providerId];
        if (!providerName) {
          console.warn(`⚠️ Model ${model.displayName} has unknown providerId: ${model.providerId}`);
          // Skip this model to prevent foreign key constraint errors
          continue;
        }
        
        // Get the actual provider ID from the database
        const actualProviderId = providerNameToIdMap[providerName];
        if (!actualProviderId) {
          console.warn(`⚠️ Provider ${providerName} not found in database`);
          // Skip this model to prevent foreign key constraint errors
          continue;
        }
        
        console.log(`Using provider ID ${actualProviderId} for model ${model.displayName}`);
        
        // Ensure categoryIds are valid
        const validCategoryIds = Array.isArray(model.categoryIds) ? model.categoryIds : [];
        
        if (validCategoryIds.length === 0) {
          console.warn(`⚠️ Model ${model.displayName} has no categoryIds`);
          // Add a default category ID based on the model type
          if (model.capabilities.includes('code-generation')) {
            validCategoryIds.push('550e8400-e29b-41d4-a716-446655441016'); // code-model-small
            console.log(`Added default category 'code-model-small' to model ${model.displayName}`);
          } else if (model.capabilities.includes('chat')) {
            validCategoryIds.push('550e8400-e29b-41d4-a716-446655441001'); // chat-model-small
            console.log(`Added default category 'chat-model-small' to model ${model.displayName}`);
          } else if (model.capabilities.includes('image-generation')) {
            validCategoryIds.push('550e8400-e29b-41d4-a716-446655441009'); // small-model (image)
            console.log(`Added default category 'small-model' to model ${model.displayName}`);
          } else if (model.capabilities.includes('text-embedding')) {
            validCategoryIds.push('550e8400-e29b-41d4-a716-446655441006'); // embed-model-small
            console.log(`Added default category 'embed-model-small' to model ${model.displayName}`);
          } else if (model.capabilities.includes('transcription')) {
            validCategoryIds.push('550e8400-e29b-41d4-a716-446655441013'); // transcription-model
            console.log(`Added default category 'transcription-model' to model ${model.displayName}`);
          } else if (model.capabilities.includes('video-generation')) {
            validCategoryIds.push('550e8400-e29b-41d4-a716-446655441015'); // video-model
            console.log(`Added default category 'video-model' to model ${model.displayName}`);
          } else {
            // Default to chat-model-small if no specific capability is found
            validCategoryIds.push('550e8400-e29b-41d4-a716-446655441001'); // chat-model-small
            console.log(`Added default category 'chat-model-small' to model ${model.displayName}`);
          }
        }
        
        // Always use the model's isPrimary flag from the DEFAULT_MODELS array
        // This ensures that the models marked as primary in the defaults are properly seeded
        const isPrimary = model.isPrimary;
        
        // Log the category IDs and primary status for debugging
        console.log(`Model ${model.displayName} has categories:`, validCategoryIds);
        console.log(`Model ${model.displayName} isPrimary:`, isPrimary);
        
        await db.insert(aiModelTable)
          .values({
            id: model.id, // Use the predefined UUID from model-management-types.ts
            providerId: actualProviderId, // Use the actual provider ID from the database
            categoryIds: validCategoryIds,
            modelId: model.modelId,
            displayName: model.displayName,
            description: model.description,
            contextLength: model.contextLength,
            capabilities: model.capabilities,
            isEnabled: model.isEnabled,
            isPrimary: isPrimary,
            pricing: model.pricing
          })
          .onConflictDoUpdate({
            target: aiModelTable.id,
            set: {
              providerId: actualProviderId, // Use the actual provider ID from the database
              categoryIds: validCategoryIds,
              displayName: model.displayName,
              description: model.description,
              contextLength: model.contextLength,
              capabilities: model.capabilities,
              isEnabled: model.isEnabled,
              isPrimary: isPrimary,
              pricing: model.pricing,
              updatedAt: new Date()
            }
          });
          
        console.log(`✅ Model ${model.displayName} upserted successfully`);
      } catch (error) {
        console.error(`Failed to upsert model ${model.displayName}:`, error);
        // Log more details about the error
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        // Continue with other models instead of failing the entire process
        console.log(`⚠️ Continuing with next model...`);
      }
    }

    // Verify models were inserted
    const insertedModels = await db.select().from(aiModelTable);
    console.log(`Found ${insertedModels.length} models in database`);
    
    // Don't throw an error if not all models were inserted, just log a warning
    if (insertedModels.length < DEFAULT_MODELS.length) {
      console.warn(`⚠️ Not all models were inserted. Expected ${DEFAULT_MODELS.length}, found ${insertedModels.length}`);
    } else {
      console.log('✅ All models inserted successfully');
    }

    console.log('✅ Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('Database connection closed');
  }
};

seedDatabase().catch((err) => {
  console.error('❌ Seeding failed');
  console.error(err);
  process.exit(1);
});