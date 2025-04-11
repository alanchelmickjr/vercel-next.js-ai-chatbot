import { NextResponse } from 'next/server';
import { getPublicPromptSuggestions, getPublicPromptSuggestionsByCategory } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    // Get category from URL query parameter
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    let prompts;
    if (category) {
      // If category is provided, fetch prompts for that category
      prompts = await getPublicPromptSuggestionsByCategory({ category }, 100);
    } else {
      // Otherwise fetch all public prompts
      prompts = await getPublicPromptSuggestions(100);
    }
    
    return NextResponse.json({ prompts }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch public prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch public prompts' },
      { status: 500 }
    );
  }
}