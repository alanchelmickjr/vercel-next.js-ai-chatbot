import { config } from 'dotenv';
import { randomUUID } from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, inArray } from 'drizzle-orm';
import { promptSuggestion, userPromptHistory } from './schema-prompt-suggestions';
import { user } from './schema';
import { readFileSync } from 'fs';
import path from 'path';

config({
  path: '.env.local',
});

// Default prompt suggestions to seed into the database
const DEFAULT_PROMPT_SUGGESTIONS = [
  {
    id: '550e8400-e29b-41d4-a716-446655450001',
    title: 'Generate an Image of...',
    label: 'random ai art',
    action: 'Generate an Image of {{random art, painting, or photo... be creative}}.',
    category: 'image',
    visibility: 'public',
    isDefault: true,
    isActive: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655450002',
    title: 'Write Py code to...',
    label: 'random coding algorithm',
    action: 'Write code to demonstrate {{coding algorithm}}',
    category: 'code',
    visibility: 'public',
    isDefault: true,
    isActive: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655450003',
    title: 'Help me write a document...',
    label: 'about an impactful subject',
    action: 'Help me create a document {{create an impactful but short document on a random subject}}',
    category: 'document',
    visibility: 'public',
    isDefault: true,
    isActive: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655450004',
    title: 'What is the weather in...',
    label: 'in random city',
    action: 'What is the weather in {{city}}',
    category: 'general',
    visibility: 'public',
    isDefault: true,
    isActive: true
  }
];

// Community prompt suggestions to seed into the database
// These are high-quality suggestions shared by the community
const COMMUNITY_PROMPT_SUGGESTIONS = [
  {
    id: '550e8400-e29b-41d4-a716-446655450101',
    title: 'Explain a concept',
    label: 'in simple terms',
    action: 'Explain {{ai:concept}} in simple terms that a 10-year-old would understand',
    complexPrompt: 'You are an expert educator with a talent for explaining complex concepts in simple terms. Break down the concept into its fundamental parts and use analogies, examples, and simple language that a 10-year-old would understand. Avoid jargon and technical terms unless you explain them clearly.',
    category: 'learning',
    visibility: 'public',
    isDefault: false,
    isActive: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655450102',
    title: 'Compare technologies',
    label: 'pros and cons',
    action: 'Compare {{technology 1}} and {{technology 2}} with their pros and cons',
    complexPrompt: 'You are a technology analyst with deep knowledge of various technologies and their applications. Provide a balanced, objective comparison of the two technologies, highlighting their strengths, weaknesses, use cases, and limitations. Include technical aspects as well as practical considerations for implementation and adoption.',
    category: 'technology',
    visibility: 'public',
    isDefault: false,
    isActive: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655450103',
    title: 'Create a story about',
    label: 'creative writing',
    action: 'Write a short story about {{ai:character}} in {{ai:setting}}',
    complexPrompt: 'You are a creative writer with a talent for crafting engaging short stories. Create a compelling narrative with a clear beginning, middle, and end. Develop the character with depth and personality, and use vivid descriptions to bring the setting to life. Include dialogue, conflict, and resolution to create a satisfying story arc.',
    category: 'creative',
    visibility: 'public',
    isDefault: false,
    isActive: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655450104',
    title: 'Solve this problem',
    label: 'step by step',
    action: 'Solve this problem step by step: {{problem description}}',
    complexPrompt: 'You are a problem-solving expert with a methodical approach to tackling challenges. Break down the problem into clear, logical steps. Explain your reasoning at each stage, consider multiple approaches when relevant, and provide a comprehensive solution. Use examples or diagrams if they would help clarify your explanation.',
    category: 'problem-solving',
    visibility: 'public',
    isDefault: false,
    isActive: true
  }
];

// Import community suggestions from generated-prompts.json if it exists
let GENERATED_COMMUNITY_SUGGESTIONS = [];
try {
  const generatedPromptsPath = path.join(process.cwd(), 'lib', 'db', 'generated-prompts.json');
  const generatedPromptsJson = readFileSync(generatedPromptsPath, 'utf8');
  GENERATED_COMMUNITY_SUGGESTIONS = JSON.parse(generatedPromptsJson);
  console.log(`Loaded ${GENERATED_COMMUNITY_SUGGESTIONS.length} generated community suggestions`);
} catch (error) {
  console.warn('Could not load generated-prompts.json, using default community suggestions only');
  console.warn(error);
}

// Combine default community suggestions with generated ones
const ALL_COMMUNITY_SUGGESTIONS = [
  ...COMMUNITY_PROMPT_SUGGESTIONS,
  ...GENERATED_COMMUNITY_SUGGESTIONS
];

const seedPromptSuggestions = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  const connection = postgres(process.env.POSTGRES_URL);
  const db = drizzle(connection);

  console.log('⏳ Seeding database with default prompt suggestions...');

  try {
    // First, check if tables exist
    try {
      console.log('🔍 Checking database state...');
      
      // Check for any tables that might match our pattern
      console.log('📊 Listing all tables in database:');
      const allTables = await connection`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      console.log('Tables in public schema:', allTables.map(t => t.table_name));
      
      // Check for both lowercase and original case table names
      // Check if PromptSuggestion table exists
      const promptSuggestionTableExists = await connection`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'promptsuggestion'
        )
      `;
      
      const promptSuggestionOriginalCaseExists = await connection`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'PromptSuggestion'
        )
      `;
      
      // Check if UserPromptHistory table exists
      const userPromptHistoryTableExists = await connection`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'userprompthistory'
        )
      `;
      
      const userPromptHistoryOriginalCaseExists = await connection`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'UserPromptHistory'
        )
      `;

      console.log('Table check results:');
      console.log(`- PromptSuggestion (lowercase) exists: ${promptSuggestionTableExists[0]?.exists}`);
      console.log(`- PromptSuggestion (original case) exists: ${promptSuggestionOriginalCaseExists[0]?.exists}`);
      console.log(`- UserPromptHistory (lowercase) exists: ${userPromptHistoryTableExists[0]?.exists}`);
      console.log(`- UserPromptHistory (original case) exists: ${userPromptHistoryOriginalCaseExists[0]?.exists}`);

      // Let's check the Drizzle migrations table to see what migrations have been applied
      console.log('Checking Drizzle migrations table:');
      try {
        const migrationsTable = await connection`
          SELECT * FROM "drizzle"."__drizzle_migrations" ORDER BY "created_at"
        `;
        console.log('Applied migrations:', JSON.stringify(migrationsTable, null, 2));
      } catch (migrationTableError) {
        console.log('Error checking migrations table:', migrationTableError);
      }

      // If tables don't exist, run the migrations first
      if ((!promptSuggestionTableExists[0]?.exists && !promptSuggestionOriginalCaseExists[0]?.exists) ||
          (!userPromptHistoryTableExists[0]?.exists && !userPromptHistoryOriginalCaseExists[0]?.exists)) {
        console.log('⚠️ Required tables not found. Please run migrations first.');
        console.log('Command: npm run db:migrate');
        throw new Error('Required tables not found');
      }
    } catch (tableCheckError) {
      console.error('Error checking for table existence:', tableCheckError);
      throw tableCheckError;
    }

    // Flush existing default and community suggestions but keep user-created ones
    console.log('🧹 Removing existing default and community suggestions...');
    await db.delete(promptSuggestion)
      .where(
        eq(promptSuggestion.isDefault, true)
      );
    
    // Also remove existing community suggestions by their IDs
    const communityIds = ALL_COMMUNITY_SUGGESTIONS.map(suggestion => suggestion.id);
    if (communityIds.length > 0) {
      await db.delete(promptSuggestion)
        .where(inArray(promptSuggestion.id, communityIds));
    }
    
    console.log('✅ Existing default and community suggestions removed');

    // Find the system user or create one if needed
    let systemUserId;
    const systemUsers = await db.select()
      .from(user)
      .limit(1);
    
    if (systemUsers.length > 0) {
      systemUserId = systemUsers[0].id;
      console.log(`Using existing user with ID ${systemUserId} for default suggestions`);
    } else {
      console.log('No users found in the database, creating a system user');
      const newUserId = randomUUID();
      await db.insert(user).values({
        id: newUserId,
        email: 'system@example.com',
        password: 'not-a-real-password'
      });
      systemUserId = newUserId;
      console.log(`Created system user with ID ${systemUserId}`);
    }

    // Insert default prompt suggestions
    console.log(`Inserting ${DEFAULT_PROMPT_SUGGESTIONS.length} default prompt suggestions...`);
    
    for (const suggestion of DEFAULT_PROMPT_SUGGESTIONS) {
      try {
        console.log(`Processing suggestion: ${suggestion.title} (${suggestion.id})`);
        
        await db.insert(promptSuggestion)
          .values({
            id: suggestion.id,
            userId: systemUserId,
            title: suggestion.title,
            label: suggestion.label,
            action: suggestion.action,
            category: suggestion.category,
            visibility: suggestion.visibility,
            isDefault: suggestion.isDefault,
            isActive: suggestion.isActive
          })
          .onConflictDoUpdate({
            target: promptSuggestion.id,
            set: {
              title: suggestion.title,
              label: suggestion.label,
              action: suggestion.action,
              category: suggestion.category,
              visibility: suggestion.visibility,
              isDefault: suggestion.isDefault,
              isActive: suggestion.isActive,
              updatedAt: new Date()
            }
          });
          
        console.log(`✅ Suggestion "${suggestion.title}" inserted/updated successfully`);
      } catch (error) {
        console.error(`Failed to insert suggestion "${suggestion.title}":`, error);
        // Log more details about the error
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        throw error;
      }
    }

    // Insert community prompt suggestions
    console.log(`Inserting ${ALL_COMMUNITY_SUGGESTIONS.length} community prompt suggestions...`);
    for (const suggestion of ALL_COMMUNITY_SUGGESTIONS) {
      try {
        console.log(`Processing community suggestion: ${suggestion.title} (${suggestion.id})`);
        
        await db.insert(promptSuggestion)
          .values({
            id: suggestion.id,
            userId: systemUserId,
            title: suggestion.title,
            label: suggestion.label,
            action: suggestion.action,
            complexPrompt: suggestion.complexPrompt,
            category: suggestion.category,
            visibility: suggestion.visibility,
            isDefault: suggestion.isDefault,
            isActive: suggestion.isActive
          })
          .onConflictDoUpdate({
            target: promptSuggestion.id,
            set: {
              title: suggestion.title,
              label: suggestion.label,
              action: suggestion.action,
              complexPrompt: suggestion.complexPrompt,
              category: suggestion.category,
              visibility: suggestion.visibility,
              isDefault: suggestion.isDefault,
              isActive: suggestion.isActive,
              updatedAt: new Date()
            }
          });
          
        console.log(`✅ Community suggestion "${suggestion.title}" inserted/updated successfully`);
      } catch (error) {
        console.error(`Failed to insert community suggestion "${suggestion.title}":`, error);
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        throw error;
      }
    }
    
    // Verify suggestions were inserted
    const insertedDefaultSuggestions = await db.select()
      .from(promptSuggestion)
      .where(eq(promptSuggestion.isDefault, true));
      
    console.log(`Found ${insertedDefaultSuggestions.length} default suggestions in database`);
    
    if (insertedDefaultSuggestions.length < DEFAULT_PROMPT_SUGGESTIONS.length) {
      console.warn(`⚠️ Not all default suggestions were inserted. Expected ${DEFAULT_PROMPT_SUGGESTIONS.length}, found ${insertedDefaultSuggestions.length}`);
    } else {
      console.log('✅ All default suggestions inserted successfully');
    }
    
    // Verify community suggestions were inserted
    const communitySuggestionIds = ALL_COMMUNITY_SUGGESTIONS.map(suggestion => suggestion.id);
    const insertedCommunitySuggestions = await db.select()
      .from(promptSuggestion)
      .where(inArray(promptSuggestion.id, communitySuggestionIds));
      
    console.log(`Found ${insertedCommunitySuggestions.length} community suggestions in database`);
    
    if (insertedCommunitySuggestions.length < ALL_COMMUNITY_SUGGESTIONS.length) {
      console.warn(`⚠️ Not all community suggestions were inserted. Expected ${ALL_COMMUNITY_SUGGESTIONS.length}, found ${insertedCommunitySuggestions.length}`);
    } else {
      console.log('✅ All community suggestions inserted successfully');
    }

    console.log('✅ Prompt suggestions seeding completed successfully');
  } catch (error) {
    console.error('❌ Prompt suggestions seeding failed:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('Database connection closed');
  }
};

seedPromptSuggestions().catch((err) => {
  console.error('❌ Prompt suggestions seeding failed');
  console.error(err);
  process.exit(1);
});