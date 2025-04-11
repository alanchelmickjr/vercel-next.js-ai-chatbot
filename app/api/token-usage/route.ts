/**
 * Token Usage API Route
 * 
 * Purpose: Handle token usage tracking and reporting
 * 
 * This module provides API endpoints for:
 * - Recording token usage
 * - Retrieving token usage reports
 * - Checking subscription limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/connection';
import { tokenUsage } from '@/lib/db/schema-token-usage';
import { eq, and, gte, lte, sum } from 'drizzle-orm';

/**
 * POST /api/token-usage
 * 
 * Record token usage
 * 
 * Request body:
 * - userId: User ID
 * - modelId: Model ID
 * - provider: Provider name
 * - inputTokens: Number of input tokens
 * - outputTokens: Number of output tokens
 * - totalTokens: Total number of tokens
 * - cost: Cost in dollars
 * - timestamp: Timestamp
 * - metadata: Optional metadata
 */
export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const {
      userId,
      modelId,
      provider,
      inputTokens,
      outputTokens,
      totalTokens,
      cost,
      timestamp,
      metadata = {}
    } = body;
    
    // Validate required fields
    if (!userId || !modelId || !provider || inputTokens === undefined || outputTokens === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get subscription tier from user (in a real implementation, you would get this from the user's profile)
    const subscriptionTier = 'free'; // Default to free tier
    
    // Insert token usage record
    await db.insert(tokenUsage).values({
      userId,
      modelId,
      provider,
      inputTokens,
      outputTokens,
      totalTokens: totalTokens || (inputTokens + outputTokens),
      cost: cost || 0,
      subscriptionTier,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      metadata: metadata ? JSON.stringify(metadata) : null
    });
    
    return NextResponse.json({
      success: true,
      message: 'Token usage recorded successfully'
    });
  } catch (error) {
    console.error('Error recording token usage:', error);
    return NextResponse.json({ error: 'Failed to record token usage' }, { status: 500 });
  }
}

/**
 * GET /api/token-usage
 * 
 * Get token usage report
 * 
 * Query parameters:
 * - userId: User ID
 * - startDate: Start date (ISO string)
 * - endDate: End date (ISO string)
 * - provider: Provider name (optional)
 * - model: Model ID (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || session.user.id;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date();
    const provider = searchParams.get('provider');
    const model = searchParams.get('model');
    
    // Build query conditions
    const conditions = [
      eq(tokenUsage.userId, userId as string),
      gte(tokenUsage.timestamp, startDate),
      lte(tokenUsage.timestamp, endDate)
    ];
    
    // Add optional filters
    if (provider) {
      conditions.push(eq(tokenUsage.provider, provider));
    }
    
    if (model) {
      conditions.push(eq(tokenUsage.modelId, model));
    }
    
    // Execute query with all conditions
    const query = db.select({
      totalInputTokens: sum(tokenUsage.inputTokens),
      totalOutputTokens: sum(tokenUsage.outputTokens),
      totalCost: sum(tokenUsage.cost)
    })
    .from(tokenUsage)
    .where(and(...conditions));
    
    // Execute query
    const result = await query;
    
    // Get detailed usage by model
    const usageByModel = await db.select({
      modelId: tokenUsage.modelId,
      provider: tokenUsage.provider,
      totalInputTokens: sum(tokenUsage.inputTokens),
      totalOutputTokens: sum(tokenUsage.outputTokens),
      totalCost: sum(tokenUsage.cost)
    })
    .from(tokenUsage)
    .where(
      and(
        eq(tokenUsage.userId, userId as string),
        gte(tokenUsage.timestamp, startDate),
        lte(tokenUsage.timestamp, endDate)
      )
    )
    .groupBy(tokenUsage.modelId, tokenUsage.provider);
    
    return NextResponse.json({
      success: true,
      usage: {
        totalInputTokens: Number(result[0]?.totalInputTokens || 0),
        totalOutputTokens: Number(result[0]?.totalOutputTokens || 0),
        totalTokens: Number(result[0]?.totalInputTokens || 0) + Number(result[0]?.totalOutputTokens || 0),
        totalCost: Number(result[0]?.totalCost || 0),
        startDate,
        endDate,
        usageByModel
      }
    });
  } catch (error) {
    console.error('Error getting token usage report:', error);
    return NextResponse.json({ error: 'Failed to get token usage report' }, { status: 500 });
  }
}