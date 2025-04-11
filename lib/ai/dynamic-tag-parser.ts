import { getCachedTagReplacements, cacheTagReplacements } from '@/lib/vercel-kv/client';

/**
 * Interface for parsed dynamic tag results
 */
interface ParsedTagResult {
  originalAction: string;
  processedAction: string;
  foundTags: TagInfo[];
}

/**
 * Interface for tag information
 */
export interface TagInfo {
  name: string;
  isAutoFill: boolean;
  originalText: string;
}

/**
 * Extracts dynamic tags from a string using the {{tag}} format
 * Supports ai: prefix for auto-filled tags (e.g., {{ai:city}})
 * @param text Text containing potential dynamic tags
 * @returns Array of TagInfo objects with tag details
 */
export function extractDynamicTags(text: string): TagInfo[] {
  const tagRegex = /\{\{([^}]+)\}\}/g;
  const matches = [...text.matchAll(tagRegex)];
  
  return matches.map(match => {
    const fullMatch = match[0]; // The full {{tag}} text
    const tagContent = match[1].trim();
    
    // Check if tag has ai: prefix for auto-filling
    const isAutoFill = tagContent.startsWith('ai:');
    const name = isAutoFill ? tagContent.substring(3).trim() : tagContent;
    
    return {
      name,
      isAutoFill,
      originalText: fullMatch
    };
  });
}

/**
 * Checks if a string contains any dynamic tags
 * @param text Text to check for dynamic tags
 * @returns True if the text contains dynamic tags
 */
export function hasDynamicTags(text: string): boolean {
  const tagRegex = /\{\{([^}]+)\}\}/g;
  return tagRegex.test(text);
}

/**
 * Generates AI replacements for dynamic tags
 * Only generates replacements for tags with ai: prefix (isAutoFill=true)
 * @param tags Array of tag names to generate replacements for
 * @returns Object mapping tag names to their AI-generated replacements
 */
export async function generateTagReplacements(
  tags: TagInfo[],
  userId?: string,
  fullPrompt?: string
): Promise<Record<string, string>> {
  if (!tags.length) return {};

  // Extract tag names for caching and processing
  const tagNames = tags.map(tag => tag.name);
  const cacheKey = tagNames.sort().join('|');
  
  // Try to retrieve from cache first
  if (userId) {
    const cachedReplacements = await getCachedTagReplacements(userId, cacheKey);
    if (cachedReplacements) {
      console.log(`Using cached tag replacements for user ${userId}`);
      return cachedReplacements;
    }
  }

  try {
    // Map tags to the format expected by the server action (only name and originalText)
    const simplifiedTags = tags.map(tag => ({
      name: tag.name,
      originalText: tag.originalText
    }));
    
    // Import the server action dynamically to avoid issues with 'use server' directive
    const { generateTagReplacements: generateTagsFromAction } = await import('@/app/(chat)/actions');
    
    // Use the server action directly to generate replacements
    const replacements = await generateTagsFromAction({
      tags: simplifiedTags,
      fullPrompt: fullPrompt || '',
    });

    // Cache the replacements for future use
    if (userId) {
      await cacheTagReplacements(userId, cacheKey, replacements);
    }
    
    return replacements;
  } catch (error) {
    console.error('Error generating tag replacements:', error);
    
    // If API call fails, return the original tag names as values
    const defaultReplacements: Record<string, string> = {};
    for (const tag of tags) {
      defaultReplacements[tag.name] = tag.name;
    }
    return defaultReplacements;
  }
}

/**
 * Parse and process dynamic tags in an action text
 * Supports both auto-filled tags (with ai: prefix) and user input tags
 * @param action Original action text with potential dynamic tags
 * @returns Object containing original action, processed action, and found tags
 */
/**
 * @param action Original action text with potential dynamic tags
 * @param userId Optional user ID for caching
 * @param userInputs Optional user-provided inputs for non-auto tags
 * @returns Object containing original action, processed action, and found tags
 */
export async function parseDynamicTags(action: string, userId?: string, userInputs?: Record<string, string>): Promise<ParsedTagResult> {
  // Extract all dynamic tags
  const tags = extractDynamicTags(action);
  
  if (!tags.length) {
    return {
      originalAction: action,
      processedAction: action,
      foundTags: [],
    };
  }
  
  // Generate replacements for each tag, using userId for caching if available
  // Pass the full prompt (action) to make the model aware of the context
  const replacements = await generateTagReplacements(tags, userId, action);
  
  // Replace all tags in the original text
  let processedAction = action;
  tags.forEach(tag => {
    // If user provided inputs for non-auto tags, use those
    let replacement;
    if (!tag.isAutoFill && userInputs && userInputs[tag.name]) {
      replacement = userInputs[tag.name];
    } else {
      replacement = replacements[tag.name];
    }
    
    processedAction = processedAction.replace(tag.originalText, replacement);
  });
  
  return {
    originalAction: action,
    processedAction,
    foundTags: tags,
  };
}