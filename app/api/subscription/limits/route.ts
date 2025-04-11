/**
 * Subscription Limits API Route
 * 
 * Purpose: Check if a user is within their subscription limits
 * 
 * This module provides an API endpoint for:
 * - Checking if a user is within their token usage limits
 * - Getting subscription tier information
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/connection';
import { tokenUsage } from '@/lib/db/schema-token-usage';
import { eq, and, gte, sum } from 'drizzle-orm';

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
    const tier = searchParams.get('tier') || 'free';
    
    // Get current date
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get daily usage
    const dailyUsage = await db.select({
      totalTokens: sum(tokenUsage.totalTokens)
    })
    .from(tokenUsage)
    .where(
      and(
        eq(tokenUsage.userId, userId as string),
        gte(tokenUsage.timestamp, startOfDay)
      )
    );
    
    // Get monthly usage
    const monthlyUsage = await db.select({
      totalTokens: sum(tokenUsage.totalTokens)
    })
    .from(tokenUsage)
    .where(
      and(
        eq(tokenUsage.userId, userId as string),
        gte(tokenUsage.timestamp, startOfMonth)
      )
    );
    
    // Get daily and monthly limits based on tier
    const limits = getSubscriptionLimits(tier);
    
    // Check if user is within limits
    const dailyTokens = Number(dailyUsage[0]?.totalTokens || 0);
    const monthlyTokens = Number(monthlyUsage[0]?.totalTokens || 0);
    
    const withinDailyLimit = dailyTokens < limits.dailyTokens;
    const withinMonthlyLimit = monthlyTokens < limits.monthlyTokens;
    
    return NextResponse.json({
      withinLimits: withinDailyLimit && withinMonthlyLimit,
      usage: {
        daily: dailyTokens,
        monthly: monthlyTokens
      },
      limits: {
        daily: limits.dailyTokens,
        monthly: limits.monthlyTokens
      }
    });
  } catch (error) {
    console.error('Error checking subscription limits:', error);
    // Default to allowing usage in case of error
    return NextResponse.json({ withinLimits: true });
  }
}

/**
 * Get subscription limits based on tier
 * @param tier - Subscription tier
 * @returns Object with daily and monthly token limits
 */
function getSubscriptionLimits(tier: string) {
  // Default limits
  const limits = {
    dailyTokens: 20000,    // 20k tokens per day
    monthlyTokens: 200000  // 200k tokens per month
  };
  
  // Adjust limits based on tier
  switch (tier) {
    case 'basic':
      limits.dailyTokens = 100000;    // 100k tokens per day
      limits.monthlyTokens = 1000000; // 1M tokens per month
      break;
    case 'pro':
      limits.dailyTokens = 500000;    // 500k tokens per day
      limits.monthlyTokens = 5000000; // 5M tokens per month
      break;
    case 'enterprise':
      limits.dailyTokens = Infinity;  // Unlimited tokens per day
      limits.monthlyTokens = Infinity; // Unlimited tokens per month
      break;
  }
  
  return limits;
}