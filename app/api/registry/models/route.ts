import { NextRequest, NextResponse } from 'next/server';
import { createAIModelAction, getModelsAction } from '@/lib/db/model-management-actions';
import { AIModel } from '@/lib/db/model-management-types';
import { clearProviderCache } from '@/lib/ai/provider-registry';

/**
 * GET /api/registry/models
 * 
 * Retrieves all AI models from the database
 */
export async function GET() {
  try {
    const models = await getModelsAction();
    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}

/**
 * POST /api/registry/models
 * 
 * Creates a new AI model in the database
 */
export async function POST(request: NextRequest) {
  try {
    const model = await request.json();
    await createAIModelAction(model);
    
    // Refresh the provider cache
    await clearProviderCache();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating model:', error);
    return NextResponse.json({ error: 'Failed to create model' }, { status: 500 });
  }
}