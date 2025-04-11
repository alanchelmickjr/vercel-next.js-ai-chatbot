import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { 
  getUserApiKeys, 
  getUserApiKeyForProvider, 
  setUserApiKey, 
  deleteUserApiKey,
  setUserApiKeyEnabled
} from '@/lib/user-api-keys';
import { isFeatureEnabled } from '@/lib/feature-flags';

// GET /api/user/api-keys
export async function GET(request: NextRequest) {
  try {
    // Get user session using auth()
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Check if API key management is enabled
    const showApiKeyManagement = isFeatureEnabled('showApiKeyManagement', userId);
    if (!showApiKeyManagement) {
      return NextResponse.json(
        { error: 'API key management is disabled' },
        { status: 403 }
      );
    }
    
    // Get provider ID from query params
    const providerId = request.nextUrl.searchParams.get('providerId');
    
    if (providerId) {
      // Get API key for specific provider
      const apiKey = await getUserApiKeyForProvider(userId, providerId);
      
      // Mask API key for security
      if (apiKey) {
        const maskedKey = maskApiKey(apiKey.apiKey);
        return NextResponse.json({
          ...apiKey,
          apiKey: maskedKey
        });
      }
      
      return NextResponse.json(null);
    }
    
    // Get all API keys
    const apiKeys = await getUserApiKeys(userId);
    
    // Mask API keys for security
    const maskedKeys = apiKeys.map(key => ({
      ...key,
      apiKey: maskApiKey(key.apiKey)
    }));
    
    return NextResponse.json(maskedKeys);
  } catch (error) {
    console.error('Error getting API keys:', error);
    return NextResponse.json(
      { error: 'Failed to get API keys' },
      { status: 500 }
    );
  }
}

// POST /api/user/api-keys
export async function POST(request: NextRequest) {
  try {
    // Get user session using auth()
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Check if API key management is enabled
    const showApiKeyManagement = isFeatureEnabled('showApiKeyManagement', userId);
    if (!showApiKeyManagement) {
      return NextResponse.json(
        { error: 'API key management is disabled' },
        { status: 403 }
      );
    }
    
    // Get request body
    const body = await request.json();
    const { providerId, apiKey } = body;
    
    if (!providerId || !apiKey) {
      return NextResponse.json(
        { error: 'Provider ID and API key are required' },
        { status: 400 }
      );
    }
    
    // Set API key
    const result = await setUserApiKey(userId, providerId, apiKey);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to set API key' },
        { status: 400 }
      );
    }
    
    // Mask API key for security
    const maskedKey = maskApiKey(result.apiKey);
    
    return NextResponse.json({
      ...result,
      apiKey: maskedKey
    });
  } catch (error) {
    console.error('Error setting API key:', error);
    return NextResponse.json(
      { error: 'Failed to set API key' },
      { status: 500 }
    );
  }
}

// DELETE /api/user/api-keys
export async function DELETE(request: NextRequest) {
  try {
    // Get user session using auth()
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Check if API key management is enabled
    const showApiKeyManagement = isFeatureEnabled('showApiKeyManagement', userId);
    if (!showApiKeyManagement) {
      return NextResponse.json(
        { error: 'API key management is disabled' },
        { status: 403 }
      );
    }
    
    // Get provider ID from query params
    const providerId = request.nextUrl.searchParams.get('providerId');
    
    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }
    
    // Delete API key
    const result = await deleteUserApiKey(userId, providerId);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to delete API key' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}

// PATCH /api/user/api-keys
export async function PATCH(request: NextRequest) {
  try {
    // Get user session using auth()
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Check if API key management is enabled
    const showApiKeyManagement = isFeatureEnabled('showApiKeyManagement', userId);
    if (!showApiKeyManagement) {
      return NextResponse.json(
        { error: 'API key management is disabled' },
        { status: 403 }
      );
    }
    
    // Get request body
    const body = await request.json();
    const { providerId, isEnabled } = body;
    
    if (!providerId || isEnabled === undefined) {
      return NextResponse.json(
        { error: 'Provider ID and isEnabled are required' },
        { status: 400 }
      );
    }
    
    // Update API key enabled status
    const result = await setUserApiKeyEnabled(userId, providerId, isEnabled);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to update API key' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    );
  }
}

// Helper function to mask API key
function maskApiKey(apiKey: string): string {
  if (!apiKey) return '';
  
  // Show first 4 and last 4 characters, mask the rest
  const firstFour = apiKey.slice(0, 4);
  const lastFour = apiKey.slice(-4);
  const maskedLength = Math.max(0, apiKey.length - 8);
  const masked = '*'.repeat(maskedLength);
  
  return `${firstFour}${masked}${lastFour}`;
}