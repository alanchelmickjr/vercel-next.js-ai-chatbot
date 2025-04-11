import { NextResponse } from 'next/server';
import {
  enhancedLanguageModel,
  enhancedImageModel,
  enhancedTextEmbeddingModel,
  getCategoryForModel
} from '@/lib/ai/provider-registry';
import { DEFAULT_MODELS, DEFAULT_PROVIDERS, DEFAULT_CATEGORIES } from '@/lib/db/model-management-types';

/**
 * GET handler for registry API
 * Returns model information from the provider registry
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId');
    const type = searchParams.get('type') || 'language';
    const userId = searchParams.get('userId');
    const action = searchParams.get('action') || 'getModel';
    
    // Only log registry API calls in development or when debugging is enabled
    // This reduces unnecessary console noise that can impact performance
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_REGISTRY === 'true') {
      console.log(`[${new Date().toISOString()}] Registry API called with action: ${action}, modelId: ${modelId}, type: ${type}, userId: ${userId || 'none'}`);
    }
    
    // Handle actions that don't require modelId
    switch (action) {
      case 'getModels':
        return NextResponse.json({ models: DEFAULT_MODELS });
        
      case 'getProviders':
        return NextResponse.json({ providers: DEFAULT_PROVIDERS });
        
      case 'getCategories':
        return NextResponse.json({ categories: DEFAULT_CATEGORIES });
        
      case 'getAll':
        return NextResponse.json({
          models: DEFAULT_MODELS,
          providers: DEFAULT_PROVIDERS,
          categories: DEFAULT_CATEGORIES
        });
    }
    
    // For other actions, modelId is required
    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }
    
    // Handle different actions
    if (action === 'getCategory') {
      const category = getCategoryForModel(modelId);
      return NextResponse.json({
        modelId,
        category
      });
    }
    
    let model;
    
    // Get the appropriate model based on type
    switch (type) {
      case 'language':
        model = await enhancedLanguageModel(modelId, userId || undefined);
        break;
      case 'image':
        model = await enhancedImageModel(modelId, userId || undefined);
        break;
      case 'embedding':
        model = await enhancedTextEmbeddingModel(modelId, userId || undefined);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported model type: ${type}` },
          { status: 400 }
        );
    }
    
    // Return the model information
    return NextResponse.json({
      modelId,
      type,
      model
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching model from registry:`, error);
    
    return NextResponse.json(
      { error: 'Failed to fetch model from registry', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}