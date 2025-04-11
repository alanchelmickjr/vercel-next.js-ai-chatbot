import { NextResponse } from 'next/server';
import { ratePromptSuggestion } from '@/lib/db/rating-functions';
import { auth } from '@/app/(auth)/auth';

export async function POST(request: Request) {
  try {
    // Get the authenticated user
    const session = await auth();
    const userId = session?.user?.id;
    
    // Check if user is authenticated
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    const { id, rating } = body;
    
    // Validate required fields
    if (!id || rating === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate rating value
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 1 and 5' },
        { status: 400 }
      );
    }
    
    // Rate the prompt suggestion
    await ratePromptSuggestion({ id, rating });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error rating prompt suggestion:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message === 'Suggestion not found') {
        return NextResponse.json(
          { error: 'Suggestion not found' },
          { status: 404 }
        );
      }
      
      if (error.message === 'Rating must be between 1 and 5') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to rate prompt suggestion' },
      { status: 500 }
    );
  }
}