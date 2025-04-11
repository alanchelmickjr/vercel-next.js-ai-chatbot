import { NextRequest, NextResponse } from 'next/server';
import { updateAIModelAction, deleteAIModelAction, getModelByIdAction } from '@/lib/db/model-management-actions';
import { clearProviderCache } from '@/lib/ai/provider-registry';

/**
 * GET /api/registry/models/[id]
 * 
 * Retrieves a specific AI model by ID
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.pathname.split('/').pop();
  try {
    const model = await getModelByIdAction(id!);
    
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }
    
    return NextResponse.json(model);
  } catch (error) {
    console.error(`Error fetching model ${id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch model' }, { status: 500 });
  }
}

/**
 * PATCH /api/registry/models/[id]
 * 
 * Updates an existing AI model
 */
export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.pathname.split('/').pop();
  try {
    const updates = await request.json();
    await updateAIModelAction(id!, updates);
    
    // Refresh the provider cache
    await clearProviderCache();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error updating model ${id}:`, error);
    return NextResponse.json({ error: 'Failed to update model' }, { status: 500 });
  }
}

/**
 * DELETE /api/registry/models/[id]
 * 
 * Deletes an AI model
 */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.pathname.split('/').pop();
  try {
    await deleteAIModelAction(id!);
    
    // Refresh the provider cache
    await clearProviderCache();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error deleting model ${id}:`, error);
    return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 });
  }
}