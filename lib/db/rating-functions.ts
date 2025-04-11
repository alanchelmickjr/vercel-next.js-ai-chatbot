import { and, desc, eq, gte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { promptSuggestion } from './schema-prompt-suggestions';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * Rate a prompt suggestion
 * @param id Prompt suggestion ID
 * @param rating Rating value (1-5)
 */
export async function ratePromptSuggestion({
  id,
  rating
}: {
  id: string;
  rating: number;
}) {
  try {
    // Validate rating value
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    // Get the current suggestion to update its rating
    const [suggestion] = await db
      .select()
      .from(promptSuggestion)
      .where(eq(promptSuggestion.id, id));
    
    if (!suggestion) {
      throw new Error('Suggestion not found');
    }
    
    // Calculate new rating values
    const newRatingCount = suggestion.ratingCount + 1;
    const newRatingSum = suggestion.ratingSum + rating;
    const newAverageRating = (newRatingSum / newRatingCount).toFixed(2);
    
    // Update the suggestion with new rating values
    return await db.update(promptSuggestion)
      .set({
        ratingCount: newRatingCount,
        ratingSum: newRatingSum,
        averageRating: newAverageRating,
        updatedAt: new Date()
      })
      .where(eq(promptSuggestion.id, id));
  } catch (error) {
    console.error('Failed to rate prompt suggestion in database', error);
    throw error;
  }
}

/**
 * Get top-rated prompt suggestions
 * @param limit Maximum number of suggestions to retrieve
 * @param minRatings Minimum number of ratings required
 */
export async function getTopRatedPromptSuggestions(limit = 10, minRatings = 3) {
  try {
    return await db
      .select()
      .from(promptSuggestion)
      .where(and(
        eq(promptSuggestion.visibility, 'public'),
        eq(promptSuggestion.isActive, true),
        gte(promptSuggestion.ratingCount, minRatings)
      ))
      .orderBy(desc(promptSuggestion.averageRating))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get top-rated prompt suggestions from database', error);
    throw error;
  }
}