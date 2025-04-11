/**
 * Prompt Suggestion Save API Endpoint
 *
 * This API route handles saving user-created prompt suggestions to the database.
 * It's part of the prompt library feature that allows users to create, save,
 * and share custom prompts with the community.
 *
 * Endpoint: POST /api/prompts/save
 *
 * Required fields in request body:
 * - title: The display title of the prompt
 * - label: Short description or label for the prompt
 * - action: The actual prompt text/instructions
 *
 * Optional fields:
 * - complexPrompt: Extended prompt content for more complex use cases
 * - category: The category the prompt belongs to
 * - visibility: 'private' (default) or 'public' - controls who can see the prompt
 *
 * Authentication: Required - only logged in users can save prompts
 *
 * Response:
 * - 201 Created: Successfully saved prompt
 * - 400 Bad Request: Missing required fields
 * - 401 Unauthorized: User not authenticated
 * - 500 Server Error: Database or server error
 */

import { NextResponse } from 'next/server';
import { savePromptSuggestion } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';

/**
 * POST handler for saving prompt suggestions
 *
 * Processes incoming requests to save a new prompt suggestion,
 * validates the data, and stores it in the database.
 */
export async function POST(request: Request) {
  try {
    // Get the authenticated user from the session
    const session = await auth();
    const userId = session?.user?.id;
    
    // Check if user is authenticated - all prompt saves require a valid user
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse the request body and extract prompt data
    const body = await request.json();
    const {
      title,           // Display title for the prompt
      label,           // Short description/label
      action,          // The actual prompt text/instructions
      complexPrompt,   // Extended prompt content (optional)
      category,        // Category classification (optional)
      visibility = 'private' // Controls who can see this prompt (default: private)
    } = body;
    
    // Validate required fields - title, label and action are mandatory
    if (!title || !label || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Save the prompt suggestion to the database
    // Initialize with default values for rating metrics and status flags
    await savePromptSuggestion({
      suggestion: {
        userId,         // Links prompt to the creator
        title,          // Display title
        label,          // Short description
        action,         // Main prompt content
        complexPrompt,  // Extended prompt content (if provided)
        category,       // Category classification (if provided)
        visibility,     // Access control: 'private' or 'public'
        isDefault: false, // Not a system default prompt
        isActive: true,   // Available for use immediately
        // Initialize rating metrics for new prompts
        ratingCount: 0,   // No ratings yet
        ratingSum: 0,     // Sum of all ratings (for calculating average)
        averageRating: '0' // String representation of average rating
      }
    });
    
    // Return success response with 201 Created status
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    // Log the error for debugging and return a generic error message
    console.error('Error saving prompt suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to save prompt' },
      { status: 500 }
    );
  }
}