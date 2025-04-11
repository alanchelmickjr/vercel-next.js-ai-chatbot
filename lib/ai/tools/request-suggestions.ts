import { z } from 'zod';
import { Session } from 'next-auth';
import { DataStreamWriter, tool } from 'ai';
import { getDocumentById, saveSuggestions } from '@/lib/db/queries';
import { Suggestion } from '@/lib/db/schema';
import { generateUUID } from '@/lib/utils';

interface RequestSuggestionsProps {
  session: Session;
  dataStream: DataStreamWriter;
}

interface SuggestionData {
  originalText: string;
  suggestedText: string;
  description: string;
  id: string;
  documentId: string;
  isResolved: boolean;
}

/**
 * Helper function to parse AI response text into structured suggestions
 */
function parseResponseForSuggestions(responseText: string, originalContent: string, documentId: string): SuggestionData[] {
  // Create a default set of suggestions in case parsing fails
  const defaultSuggestions: SuggestionData[] = [];
  
  try {
    // The response might be a JSON string or contain a structured message
    // This is a simple implementation - enhance based on actual response format
    const suggestions: SuggestionData[] = [];
    
    // Try to extract useful content from the AI response
    const contentMatches = responseText.match(/"content":"([^"]+)"/g);
    if (contentMatches && contentMatches.length > 0) {
      // Process the most relevant content sections from the response
      for (let i = 0; i < Math.min(contentMatches.length, 5); i++) {
        const content = contentMatches[i].replace(/"content":"/, '').replace(/"$/, '');
        
        // Create suggestion format - adapt this logic based on your actual response format
        // This is a simplified implementation
        const parts = content.split('. ');
        if (parts.length >= 2) {
          suggestions.push({
            originalText: parts[0],
            suggestedText: parts[1],
            description: parts.slice(2).join('. ') || 'Improve clarity and structure',
            id: generateUUID(),
            documentId: documentId,
            isResolved: false,
          });
        }
      }
    }
    
    return suggestions.length > 0 ? suggestions : defaultSuggestions;
  } catch (error) {
    console.error('Error parsing suggestions:', error);
    return defaultSuggestions;
  }
}

export const requestSuggestions = ({
  session,
  dataStream,
}: RequestSuggestionsProps) =>
  tool({
    description: 'Request suggestions for a document',
    parameters: z.object({
      documentId: z
        .string()
        .describe('The ID of the document to request edits'),
    }),
    execute: async ({ documentId }) => {
      const document = await getDocumentById({ id: documentId });

      if (!document || !document.content) {
        return {
          error: 'Document not found',
        };
      }

      const suggestions: SuggestionData[] = [];

      // Use server-side API for model calls to ensure environment variables are available
      console.log(`[RequestSuggestions] Starting suggestions generation via API route`);
      
      try {
        // Generate a unique chat ID for this request
        const tempChatId = generateUUID();
        
        // Make API call through the chat route (which has access to environment variables)
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: tempChatId,
            selectedChatModel: 'anthropic:creative',
            messages: [
              {
                role: 'system',
                content: 'You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.'
              },
              {
                role: 'user',
                content: document.content
              }
            ]
          }),
        });
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        
        // Parse the response to extract suggestions
        const responseText = await response.text();
        const parsedSuggestions = parseResponseForSuggestions(responseText, document.content, documentId);
        
        // Process the suggestions as if they came from elementStream
        for (const suggestion of parsedSuggestions) {
          // Use type assertion to satisfy TypeScript's JSONValue requirement
          dataStream.writeData({
            type: 'suggestion',
            content: suggestion as any
          });
          
          suggestions.push(suggestion);
        }
        
        // Save the suggestions
        if (session.user?.id) {
          const userId = session.user.id;

          await saveSuggestions({
            suggestions: suggestions.map((suggestion) => ({
              ...suggestion,
              userId,
              createdAt: new Date(),
              documentCreatedAt: document.createdAt,
            })),
          });
        }
        
        return {
          id: documentId,
          title: document.title,
          kind: document.kind,
          message: 'Suggestions have been added to the document',
        };
      } catch (error) {
        console.error(`[RequestSuggestions] Error:`, error);
        return {
          error: 'Failed to generate suggestions',
        };
      }
    },
  });
