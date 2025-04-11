# Server-Client Separation Fix

## Issue Description

The application was encountering a build error due to improper separation between server and client components:

```
Error: You're importing a component that needs "server-only". That only works in a Server Component which is not supported in the pages/ directory.
```

The error occurred because a client component was indirectly importing a module marked with 'server-only' through this chain:
- `components/chat.tsx` → 
- `components/chat-header.tsx` → 
- `components/admin/model-manager.tsx` → 
- `lib/db/client-model-management.ts` → 
- `lib/db/queries/model-management.ts` (with server-only import)

## Solution Implemented

We implemented a proper separation between server and client code using Next.js server actions:

1. **Created Server Actions File**:
   - Created `lib/db/model-management-actions.ts` with the 'use server' directive
   - Moved server-side operations into this file
   - This file safely imports from model-management.ts

2. **Updated Client Code**:
   - Modified `lib/db/client-model-management.ts` to use server actions instead of directly importing server-only code
   - This breaks the import chain that was causing the error

3. **Fixed API Routes**:
   - Updated API routes to use the new server actions
   - Fixed type issues in route handlers by using NextRequest.nextUrl.pathname to extract parameters

## Implementation Details

### 1. Server Actions File

Created `lib/db/model-management-actions.ts`:

```typescript
'use server';

import { 
  createModelCategory, 
  deleteModelCategory,
  updateAIModel,
  deleteAIModel,
  getModelById,
  getModels,
  createAIModel
} from './queries/model-management';
import type { ModelCategory, AIModel } from './model-management-types';

// Server actions for category operations
export async function createModelCategoryAction(category: Omit<ModelCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    await createModelCategory(category);
  } catch (error) {
    console.error('Error creating category:', error);
    throw new Error('Failed to create category');
  }
}

export async function deleteModelCategoryAction(id: string): Promise<void> {
  try {
    await deleteModelCategory(id);
  } catch (error) {
    console.error('Error deleting category:', error);
    throw new Error('Failed to delete category');
  }
}

// Server actions for model operations
export async function updateAIModelAction(id: string, model: Partial<AIModel>): Promise<void> {
  try {
    await updateAIModel(id, model);
  } catch (error) {
    console.error('Error updating model:', error);
    throw new Error('Failed to update model');
  }
}

export async function deleteAIModelAction(id: string): Promise<void> {
  try {
    await deleteAIModel(id);
  } catch (error) {
    console.error('Error deleting model:', error);
    throw new Error('Failed to delete model');
  }
}

export async function getModelByIdAction(id: string): Promise<AIModel | null> {
  try {
    return await getModelById(id);
  } catch (error) {
    console.error('Error getting model:', error);
    throw new Error('Failed to get model');
  }
}

export async function getModelsAction(): Promise<AIModel[]> {
  try {
    return await getModels();
  } catch (error) {
    console.error('Error getting models:', error);
    throw new Error('Failed to get models');
  }
}

export async function createAIModelAction(model: Omit<AIModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    await createAIModel(model);
  } catch (error) {
    console.error('Error creating model:', error);
    throw new Error('Failed to create model');
  }
}
```

### 2. Client Code Updates

Updated `lib/db/client-model-management.ts` to use server actions:

```typescript
// Example of the changes made:
export async function createModelCategory(category: Omit<ModelCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  // Call the server-side API through a server action
  try {
    // Import the server action
    const { createModelCategoryAction } = await import('./model-management-actions');
    
    // Call the server action
    await createModelCategoryAction(category);
    
    // Refresh the cache
    await refreshModelCache();
  } catch (error) {
    console.error('Error creating category:', error);
    throw new Error('Failed to create category');
  }
}
```

### 3. API Route Updates

Updated API routes to use server actions and fixed parameter extraction:

```typescript
// Example of the changes made to app/api/registry/models/[id]/route.ts:
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
```

## Benefits of This Approach

1. **Clear Separation**: Properly separates server and client code
2. **Type Safety**: Maintains type safety across the boundary
3. **Performance**: Server actions are optimized for server-side execution
4. **Maintainability**: Makes the code easier to understand and maintain
5. **Compatibility**: Works with Next.js's App Router architecture

## Lessons Learned

1. When using Next.js, it's important to properly separate server and client code
2. Server actions provide a clean way to call server-side code from client components
3. The 'server-only' package should only be imported in server components or server actions
4. API routes should use proper parameter extraction techniques