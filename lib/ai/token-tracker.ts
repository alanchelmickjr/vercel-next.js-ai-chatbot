/**
 * Token Tracker
 * 
 * Purpose: Track token usage and manage subscription limits
 * 
 * This module provides functionality for:
 * - Counting tokens in text using appropriate tokenizers
 * - Tracking token usage for AI requests
 * - Checking subscription limits
 * - Recording usage data in the database
 * - Providing fallback models when rate limits are reached
 */

import { LanguageModel, Message } from 'ai';
import { registry } from './provider-registry';

// Define types for the language model parameters and results
interface GenerateParams {
  messages: Message[];
  [key: string]: any;
}

interface GenerateResult {
  text: string;
  [key: string]: any;
}

// Define a more specific type for our language model
interface TrackedLanguageModel extends LanguageModel {
  id: string;
  generate: (params: GenerateParams) => Promise<GenerateResult>;
}

// Token counting function using appropriate tokenizer
export async function countTokens(text: string, model: string): Promise<number> {
  // Simple estimation for now - can be replaced with more accurate tokenizers
  // like tiktoken for OpenAI models or specific tokenizers for other providers
  
  // For OpenAI models, roughly 4 characters per token
  if (model.startsWith('openai:')) {
    return Math.ceil(text.length / 4);
  }
  
  // For Anthropic models, roughly 4.5 characters per token
  if (model.startsWith('anthropic:')) {
    return Math.ceil(text.length / 4.5);
  }
  
  // Default estimation
  return Math.ceil(text.length / 4);
}

// Interface for token usage data
export interface TokenUsage {
  userId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
  cost?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Record token usage in the database
export async function recordTokenUsage(usage: TokenUsage): Promise<void> {
  try {
    // Calculate total tokens if not provided
    const totalTokens = usage.totalTokens || (usage.inputTokens + usage.outputTokens);
    
    // Calculate cost based on model pricing (simplified)
    const cost = usage.cost || calculateCost(usage.modelId, usage.inputTokens, usage.outputTokens);
    
    // Extract provider from modelId
    const provider = usage.modelId.split(':')[0] || 'unknown';
    
    // Send usage data to the API endpoint
    const response = await fetch('/api/token-usage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: usage.userId,
        modelId: usage.modelId,
        provider,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens,
        cost,
        timestamp: usage.timestamp,
        metadata: usage.metadata || {}
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to record token usage: ${response.statusText}`);
    }
  } catch (error) {
    // Log error but don't fail the application
    console.error('Error recording token usage:', error);
  }
}

// Calculate cost based on model pricing (simplified)
function calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  // Extract provider from modelId
  const provider = modelId.split(':')[0] || 'unknown';
  
  // Simple pricing based on provider (in microcents - 1/1,000,000 of a dollar)
  let inputPrice = 1500;  // Default input price
  let outputPrice = 5000; // Default output price
  
  // Adjust pricing based on provider
  if (provider === 'anthropic') {
    inputPrice = 3000;
    outputPrice = 15000;
  }
  
  // Calculate cost
  return (inputTokens * inputPrice + outputTokens * outputPrice) / 1000000;
}

// Check if user is within subscription limits
export async function checkSubscriptionLimits(
  userId: string,
  subscriptionTier: string
): Promise<boolean> {
  try {
    // Get subscription limits from the API
    const response = await fetch(`/api/subscription/limits?userId=${userId}&tier=${subscriptionTier}`);
    
    if (!response.ok) {
      throw new Error(`Failed to check subscription limits: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Return whether user is within limits
    return data.withinLimits;
  } catch (error) {
    // Log error but allow usage (fail open)
    console.error('Error checking subscription limits:', error);
    return true;
  }
}

// Get appropriate fallback model if rate limited
export function getFallbackModel(originalModel: string): string {
  // Always fall back to the quick model category
  return 'chat-model-quick';
}

// Middleware for tracking tokens
export function withTokenTracking<T extends TrackedLanguageModel>(
  model: T,
  userId?: string,
  subscriptionTier: string = 'free',
  metadata?: Record<string, any>
): T {
  return {
    ...model,
    generate: async (params: GenerateParams) => {
      // Check subscription limits
      const withinLimits = await checkSubscriptionLimits(userId || 'anonymous', subscriptionTier);
      
      // If not within limits, use fallback model
      let actualModel = model;
      if (!withinLimits) {
        const fallbackCategory = getFallbackModel(model.id);
        // Use enhancedLanguageModel to resolve the category to an actual model
        const { enhancedLanguageModel } = await import('./provider-registry');
        // Await the promise and then cast to T
        actualModel = await enhancedLanguageModel(fallbackCategory, userId) as unknown as T;
      }
      
      // Count input tokens
      const inputText = params.messages.map((m: Message) => m.content).join('\n');
      const inputTokens = await countTokens(inputText, actualModel.id);
      
      // Call original model
      const result = await actualModel.generate(params);
      
      // Count output tokens
      const outputTokens = await countTokens(result.text, actualModel.id);
      
      // Record usage
      await recordTokenUsage({
        userId: userId || 'anonymous',
        modelId: actualModel.id,
        inputTokens,
        outputTokens,
        timestamp: new Date(),
        metadata
      });
      
      return result;
    }
  } as T;
}