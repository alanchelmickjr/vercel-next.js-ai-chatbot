/**
 * Server Actions for AI Operations
 *
 * This file contains server-side actions for various AI operations including:
 * - Generating chat titles from user messages
 * - Creating AI-generated images from text prompts
 * - Generating text embeddings for vector search/similarity
 * - Dynamically replacing template tags in prompts
 * - Managing chat visibility and message history
 *
 * These functions are marked with 'use server' to ensure they only execute on the server,
 * protecting API keys and sensitive operations from client-side exposure.
 *
 * The file uses the model registry pattern to abstract provider-specific implementations,
 * allowing for easy switching between different AI providers.
 */

'use server';

import { cookies } from 'next/headers';

import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/db/queries';
import { VisibilityType } from '@/components/visibility-selector';
import { generateText, experimental_generateImage, embed } from '@/lib/ai/enhanced-ai-sdk';
import { Message } from 'ai';

/**
 * Saves the user's selected chat model preference as a cookie
 *
 * This allows the application to remember the user's model preference
 * across page refreshes and sessions.
 *
 * @param model - The model identifier string in format "provider:model"
 */
/**
 * This function is deprecated and should not be used.
 * Model preferences should be managed client-side only to avoid unnecessary server interactions.
 *
 * @deprecated Use client-side cookie and localStorage for model preferences instead
 */
export async function saveChatModelAsCookie(model: string) {
  // This function is intentionally left empty to maintain backward compatibility
  // while preventing any actual server-side cookie operations
  return;
}

/**
 * Generates a title for a chat based on the user's first message
 *
 * This function uses an AI model to analyze the user's initial message
 * and create a concise, descriptive title for the chat conversation.
 * The title is used in the chat history sidebar for easy identification.
 *
 * @param message - The user's message object containing content to summarize
 * @param modelOverride - Optional override for the AI model to use
 * @returns A generated title string (max 80 characters)
 */
export async function generateTitleFromUserMessage({
  message,
  modelOverride,
}: {
  message: Message;
  modelOverride?: string;
}) {
  // Use the provided model or get from database
  // This specialized model is optimized for generating concise titles
  const titleModel = modelOverride || 'title-model';
  
  // Get the appropriate model from the registry and generate the title
  const { text: title } = await generateText({
    model: titleModel,
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

/**
 * Generates an image based on a text prompt
 *
 * This function uses AI image generation models to create images from text descriptions.
 * It includes error handling with fallback to a default model if the specified model fails.
 *
 * The function uses the model registry pattern to abstract provider-specific implementations,
 * allowing for easy switching between different image generation providers.
 *
 * @param prompt - The text description to generate an image from
 * @param providerModel - The model to use in format "provider:model"
 * @returns A base64-encoded image string that can be displayed in an <img> tag
 */
export async function generateImage({
  prompt,
  providerModel,
}: {
  prompt: string;
  providerModel?: string;
}) {
  // Log the model being used for debugging and monitoring
  console.log(`Generating image with model: ${providerModel}`);
  
  try {
    // Attempt to generate the image with the specified model
    const { image } = await experimental_generateImage({
      model: providerModel || 'image',
      prompt,
    });
    
    return image;
  } catch (error) {
    console.error(`Error generating image with model ${providerModel}:`, error);
    
    // Let the enhanced registry handle fallbacks
    console.log('Error with specified model, letting registry handle fallback');
    // The enhanced registry will handle fallbacks automatically
    // No need to hardcode a specific fallback model
    throw error;
  }
}

/**
 * Generates text embeddings for vector search/similarity
 *
 * Text embeddings convert text into numerical vector representations that capture semantic meaning.
 * These vectors can be used for:
 * - Semantic search (finding similar content)
 * - Content clustering
 * - Recommendation systems
 * - Other machine learning applications
 *
 * The function includes error handling with fallback to a default model if the specified model fails.
 *
 * @param text - The text to generate embeddings for
 * @param providerModel - The model to use in format "provider:model"
 * @returns An array of floating-point numbers representing the text embedding
 */
export async function generateEmbedding({
  text,
  providerModel,
}: {
  text: string;
  providerModel?: string;
}) {
  // Log the model being used for debugging and monitoring
  console.log(`Generating embedding with model: ${providerModel}`);
  
  try {
    // Attempt to generate the embedding with the specified model
    const { embedding } = await embed({
      model: providerModel || 'embed',
      value: text,
    });
    
    return embedding;
  } catch (error) {
    console.error(`Error generating embedding with model ${providerModel}:`, error);
    
    // Let the enhanced registry handle fallbacks
    console.log('Error with specified model, letting registry handle fallback');
    // The enhanced registry will handle fallbacks automatically
    // No need to hardcode a specific fallback model
    throw error;
  }
}

/**
 * Generates replacements for dynamic tags in a prompt
 *
 * This function powers the template tag system, which allows prompts to contain
 * variable placeholders (e.g., {{city}}, {{topic}}) that get replaced with
 * contextually appropriate values generated by AI.
 *
 * Features:
 * - Uses the full prompt as context to generate relevant replacements
 * - Handles multiple tags in a single request for efficiency
 * - Includes fallback mechanisms for error handling
 * - Processes AI responses to extract clean replacement values
 *
 * @param tags - Array of tag objects containing name and original text
 * @param fullPrompt - The complete prompt containing the tags (for context)
 * @param modelOverride - Optional model override
 * @returns Object mapping tag names to their AI-generated replacements
 */
export async function generateTagReplacements({
  tags,
  fullPrompt,
  modelOverride,
}: {
  tags: { name: string; originalText: string }[];
  fullPrompt: string;
  modelOverride?: string;
}) {
  // Early return if no tags to process
  if (!tags.length) return {};
  
  // Use the provided model or default
  const tagModel = modelOverride;
  
  // Create a prompt that includes both the tags and the full context
  // This helps the AI understand the context in which the tags will be used
  const prompt = `
Full prompt context:
"""
${fullPrompt}
"""

Generate a context-appropriate replacement for each of the following tags that will be inserted into the above prompt.
Return ONLY the replacement text, nothing more.

${tags.map((tag, index) => `${index + 1}. {{${tag.name}}}`).join('\n')}
`;

  try {
    // Generate the replacements using the registry approach
    const { text: responseText } = await generateText({
      model: tagModel || 'quick',
      system: 'You are a helpful assistant that provides concise, useful, creative replacements for template tags. This tag augments an existing prompt by providing variable information to complete the prompt.',
      prompt,
    });
    
    // Process the response into tag replacements
    const lines = responseText.split('\n').filter((line: string) => line.trim());
    const replacements: Record<string, string> = {};
    
    // Process tags with AI-generated values
    // Handle different response formats (numbered, plain text, etc.)
    for (let i = 0; i < tags.length && i < lines.length; i++) {
      const line = lines[i].trim();
      let value = line;
      
      // Try to handle numbered responses (e.g., "1. New York City")
      const numberedMatch = line.match(/^\d+\.\s*(.+)$/);
      if (numberedMatch) {
        value = numberedMatch[1];
      }
      
      // Store the replacement value for this tag
      replacements[tags[i].name] = value;
    }
    
    return replacements;
  } catch (error) {
    console.error(`Error generating tag replacements with model ${tagModel}:`, error);
    
    // Let the enhanced registry handle fallbacks
    console.log('Error with specified model, letting registry handle fallback');
    
    // If all AI attempts fail, use a simple fallback that just uses the tag names
    // This ensures the application doesn't crash even if AI services are unavailable
    const defaultReplacements: Record<string, string> = {};
    for (const tag of tags) {
      defaultReplacements[tag.name] = tag.name;
    }
    return defaultReplacements;
  }
}

/**
 * Deletes all messages in a chat that were created after a specific message
 *
 * This function is used to implement the "regenerate from here" feature,
 * which allows users to delete all messages after a certain point and
 * generate new responses from that point forward.
 *
 * @param id - The ID of the message to delete from (and all subsequent messages)
 */
export async function deleteTrailingMessages({ id }: { id: string }) {
  // Get the message to determine its chat ID and timestamp
  const [message] = await getMessageById({ id });

  // Delete all messages in the chat that were created after this message
  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

/**
 * Updates the visibility setting for a chat conversation
 *
 * This function allows changing a chat's visibility between:
 * - private: Only visible to the creator
 * - public: Visible to anyone with the link
 * - organization: Visible to members of the same organization
 *
 * @param chatId - The ID of the chat to update
 * @param visibility - The new visibility setting (private, public, organization)
 */
export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}
