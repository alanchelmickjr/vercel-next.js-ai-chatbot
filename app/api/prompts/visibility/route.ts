import { NextResponse } from 'next/server';
import { updatePromptSuggestionVisibility } from '@/lib/db/queries';

export async function PATCH(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { id, visibility } = body;
    
    // Validate required fields
    if (!id || !visibility || !['private', 'public'].includes(visibility)) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }
    
    // Update the prompt suggestion visibility
    await updatePromptSuggestionVisibility({
      id,
      visibility
    });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error updating prompt suggestion visibility:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt visibility' },
      { status: 500 }
    );
  }
}