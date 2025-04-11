import { auth } from '@/app/(auth)/auth';
import { getDefaultPromptSuggestions, getPromptSuggestionsByUserId, getPublicPromptSuggestions } from '@/lib/db/queries';
import { getTopRatedPromptSuggestions } from '@/lib/db/rating-functions';
import {
  cacheDefaultSuggestions,
  cacheSuggestions,
  getCachedSuggestions,
  getDefaultCachedSuggestions,
  getCommunityCachedSuggestions,
  cacheCommunitySuggestions
} from '@/lib/vercel-kv/client';
import { NextResponse } from 'next/server';

/**
 * GET handler for prompt suggestions API
 * 
 * Retrieves personalized or default prompt suggestions for the user
 * Uses KV cache when available and falls back to database queries
 * If the database tables are empty, uses hardcoded primer suggestions
 */
export async function GET(request: Request) {
  // Get query parameters
  const url = new URL(request.url);
  const source = url.searchParams.get('source') || 'all'; // 'personal', 'community', or 'all'
  const sort = url.searchParams.get('sort') || 'recent'; // 'recent' or 'top-rated'
  // Hardcoded primers to use if database is empty - moved outside try/catch for scope access
  const primerSuggestions = [
    {
      id: '1',
      title: 'Generate an Image of...',
      label: 'random ai art',
      action: 'Generate an Image of {{random art, painting, or photo... be creative}}.',
    },
    {
      id: '2',
      title: 'Write Py code to...',
      label: 'random coding algorithm',
      action: 'Write code to demonstrate {{coding algorithm}}',
    },
    {
      id: '3',
      title: 'Help me write a document...',
      label: 'about an impactful subject',
      action: 'Help me create a document {{create an impactful but short document on a random subject}}',
    },
    {
      id: '4',
      title: 'What is the weather in...',
      label: 'in random city',
      action: 'What is the weather in {{city}}',
    },
  ];

  try {
    console.log('GET /api/prompts/suggestions - Started');
    
    // Get the authenticated user
    const session = await auth();
    const userId = session?.user?.id;

    // Get both personal and community suggestions based on the source parameter
    let personalSuggestions: any[] = [];
    let communitySuggestions: any[] = [];
    
    // Get personal suggestions if source is 'all' or 'personal'
    if ((source === 'all' || source === 'personal') && userId) {
      console.log(`Getting personal suggestions for user ${userId}`);
      const cachedSuggestions = await getCachedSuggestions(userId);
      
      if (cachedSuggestions) {
        console.log(`Found cached personal suggestions for user ${userId}`);
        personalSuggestions = cachedSuggestions.map(suggestion => ({
          ...suggestion,
          source: 'personal' as const
        }));
      } else {
        // If no cached suggestions, try to get user-specific suggestions from DB
        console.log(`No cached personal suggestions for user ${userId}, fetching from database`);
        const userSuggestions = await getPromptSuggestionsByUserId({ userId });
        
        if (userSuggestions && userSuggestions.length > 0) {
          console.log(`Found ${userSuggestions.length} user suggestions in database`);
          
          // Map DB suggestions to cached format
          personalSuggestions = userSuggestions.map(suggestion => ({
            id: suggestion.id,
            title: suggestion.title,
            label: suggestion.label,
            action: suggestion.action,
            category: suggestion.category || undefined,
            source: 'personal' as const,
            ratingCount: suggestion.ratingCount,
            ratingSum: suggestion.ratingSum,
            averageRating: suggestion.averageRating
          }));
          
          // Cache the suggestions for future use
          await cacheSuggestions(userId, personalSuggestions);
        }
      }
    }
    
    // Get community suggestions if source is 'all' or 'community'
    if (source === 'all' || source === 'community') {
      console.log('Getting community suggestions');
      
      // Try to get cached community suggestions first
      const cachedCommunitySuggestions = await getCommunityCachedSuggestions();
      
      if (cachedCommunitySuggestions && cachedCommunitySuggestions.length > 0) {
        console.log('Found cached community suggestions');
        communitySuggestions = cachedCommunitySuggestions;
      } else {
        // If no cached community suggestions, try to get from DB
        console.log('No cached community suggestions, fetching from database');
        
        // Get suggestions based on sort parameter
        let publicSuggestions;
        if (sort === 'top-rated') {
          console.log('Fetching top-rated community suggestions');
          publicSuggestions = await getTopRatedPromptSuggestions(10, 1); // Minimum 1 rating
        } else {
          console.log('Fetching recent community suggestions');
          publicSuggestions = await getPublicPromptSuggestions(10);
        }
        
        if (publicSuggestions && publicSuggestions.length > 0) {
          console.log(`Found ${publicSuggestions.length} public suggestions in database`);
          
          // Map DB suggestions to cached format
          communitySuggestions = publicSuggestions.map(suggestion => ({
            id: suggestion.id,
            title: suggestion.title,
            label: suggestion.label,
            action: suggestion.action,
            category: suggestion.category || undefined,
            source: 'community' as const,
            ratingCount: suggestion.ratingCount,
            ratingSum: suggestion.ratingSum,
            averageRating: suggestion.averageRating
          }));
          
          // Cache the community suggestions
          await cacheCommunitySuggestions(communitySuggestions);
        } else {
          // If no community suggestions found, log a warning but don't generate them
          // They should be properly seeded in the database
          console.log('No community suggestions found in database. Please run the seed script to populate community suggestions.');
          communitySuggestions = [];
        }
      }
    }
    
    // Combine suggestions based on source parameter
    let combinedSuggestions = [];
    
    if (source === 'personal') {
      combinedSuggestions = personalSuggestions;
    } else if (source === 'community') {
      combinedSuggestions = communitySuggestions;
    } else {
      // For 'all', combine both with personal suggestions first
      combinedSuggestions = [...personalSuggestions, ...communitySuggestions];
    }
    
    // If we have suggestions, return them
    if (combinedSuggestions.length > 0) {
      return NextResponse.json({ suggestions: combinedSuggestions });
    }
    
    // Try to get default cached suggestions (for anonymous users or as fallback)
    console.log('Getting default suggestions');
    const cachedDefaultSuggestions = await getDefaultCachedSuggestions();
    
    if (cachedDefaultSuggestions) {
      console.log('Found cached default suggestions');
      return NextResponse.json({ suggestions: cachedDefaultSuggestions });
    }
    
    // If no cached defaults, get from DB
    console.log('No cached default suggestions, fetching from database');
    const defaultSuggestions = await getDefaultPromptSuggestions();
    
    if (defaultSuggestions && defaultSuggestions.length > 0) {
      console.log(`Found ${defaultSuggestions.length} default suggestions in database`);
      
      // Map DB suggestions to cached format
      const formattedSuggestions = defaultSuggestions.map(suggestion => ({
        id: suggestion.id,
        title: suggestion.title,
        label: suggestion.label,
        action: suggestion.action,
        category: suggestion.category || undefined,
        ratingCount: suggestion.ratingCount,
        ratingSum: suggestion.ratingSum,
        averageRating: suggestion.averageRating
      }));
      
      // Cache the default suggestions
      await cacheDefaultSuggestions(formattedSuggestions);
      
      return NextResponse.json({ suggestions: formattedSuggestions });
    }
    
    // If we get here, no suggestions were found - use the primers
    console.log('No suggestions found, using primer suggestions');
    
    // Add source to primer suggestions
    const sourcedPrimerSuggestions = primerSuggestions.map(suggestion => ({
      ...suggestion,
      source: 'personal' as const
    }));
    
    // Cache the primer suggestions for future use
    try {
      if (userId) {
        console.log(`Caching user suggestions for user ${userId}`);
        await cacheSuggestions(userId, sourcedPrimerSuggestions);
      }
      console.log('Caching default suggestions');
      await cacheDefaultSuggestions(sourcedPrimerSuggestions);
      
      // We don't generate community suggestions anymore - they should be in the database
      // Just log a message about it
      if (source === 'all' || source === 'community') {
        console.log('Note: Community suggestions should be seeded in the database');
      }
      
      console.log('Cached successfully');
    } catch (cacheError) {
      console.error('Error caching suggestions:', cacheError);
      // Continue even if caching fails
    }
    
    // Return appropriate suggestions based on source
    if (source === 'community') {
      console.log('No community suggestions available - returning empty array');
      return NextResponse.json({ suggestions: [] });
    } else {
      console.log('Returning primer suggestions');
      return NextResponse.json({ suggestions: sourcedPrimerSuggestions });
    }
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    
    // Return the primer suggestions even in case of error
    try {
      console.log('FALLBACK: Attempting to return primer suggestions directly');
      // Return appropriate suggestions based on source
      if (source === 'community') {
        console.log('FALLBACK: No community suggestions available - returning empty array');
        return NextResponse.json(
          { suggestions: [] },
          { status: 200 }
        );
      } else {
        const sourcedPrimerSuggestions = primerSuggestions.map(suggestion => ({
          ...suggestion,
          source: 'personal' as const
        }));
        return NextResponse.json(
          { suggestions: sourcedPrimerSuggestions },
          { status: 200 }
        );
      }
    } catch (fallbackError) {
      console.error('CRITICAL: Even fallback failed:', fallbackError);
      return NextResponse.json(
        {
          error: 'Failed to fetch suggestions',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        },
        { status: 500 }
      );
    }
  }
}