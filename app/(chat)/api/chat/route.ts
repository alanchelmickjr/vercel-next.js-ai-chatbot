/**
 * Chat API Route Handler
 *
 * This file implements the core chat functionality for the application, handling:
 * 1. Text/chat responses - Streaming AI-generated text responses
 * 2. Image generation - Creating AI-generated images from text prompts
 * 3. Embedding generation - Creating vector embeddings from text
 *
 * The API supports:
 * - Authentication and authorization
 * - Message persistence to database
 * - Streaming responses using Vercel AI SDK
 * - Multiple AI providers through the provider registry
 * - Tool usage (weather, document creation/updating, suggestions)
 * - Error handling with unique error IDs for tracing
 *
 * Endpoints:
 * - POST /api/chat - Process new chat messages and generate responses
 * - DELETE /api/chat?id={chatId} - Delete a chat conversation
 *
 * Request format for POST:
 * {
 *   id: string,              // Chat ID
 *   messages: Array,         // Chat message history
 *   selectedChatModel: string, // Model ID in format "provider:model"
 *   desiredOutput: string    // "text", "image", or "embed"
 * }
 */

import {
  UIMessage,
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
  experimental_generateImage,
  embed,
} from '@/lib/ai/enhanced-ai-sdk';
import { tool } from '@/lib/tools/tool-wrapper';
import { DEFAULT_MODELS, AIModel } from '@/lib/db/model-management-types';
import { auth } from '@/app/(auth)/auth';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
  updateChatTitle,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from '@/lib/utils';
import { generateTitleFromUserMessage, generateImage, generateEmbedding } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { deleteFileTool } from '@/lib/ai/tools/delete-file';
import { addMemoryTool, getMemoriesTool, searchMemoriesTool, clearMemoriesTool } from '@/lib/ai/tools/memory-tool';
import { isProductionEnvironment } from '@/lib/constants';
import { registry, enhancedLanguageModel, enhancedImageModel, enhancedTextEmbeddingModel, categoryModelMap } from '@/lib/ai/provider-registry';

// Set maximum duration for serverless function execution (60 seconds)
// This prevents the function from timing out during long-running operations
export const maxDuration = 60;

/**
 * POST handler for chat API endpoint
 *
 * Processes incoming chat requests, manages authentication, saves messages,
 * and streams AI responses back to the client. Supports multiple output types:
 * - text/chat: Standard conversational AI responses
 * - image: AI-generated images from text prompts
 * - embed: Vector embeddings for text
 *
 * The function handles the entire lifecycle of a chat message:
 * 1. Authentication and validation
 * 2. Message persistence
 * 3. AI model selection and invocation
 * 4. Response streaming
 * 5. Error handling
 */

// Set to false to disable debug logging
const DEBUG = false;

export async function POST(request: Request) {
  // Generate a unique request ID for tracing and logging
  const requestId = generateUUID();
  if (DEBUG) console.log(`[${new Date().toISOString()}][RequestID: ${requestId}] Chat API POST request received`);
  
  try {
    // Log the raw request
    const requestClone = request.clone();
    const rawBody = await requestClone.text();
    if (DEBUG) console.log(`[${new Date().toISOString()}][RequestID: ${requestId}] Raw request body: ${rawBody}`);
    
    // Extract request data including chat ID, messages, model selection, and desired output type
    const requestData = await request.json();
    if (DEBUG) console.log(`[${new Date().toISOString()}][RequestID: ${requestId}] Parsed request data:`, JSON.stringify(requestData));
    
    const {
      id,
      messages,
      selectedChatModel,
    } = requestData;
    
    // Use let for desiredOutput so we can reassign it if needed
    let desiredOutput = requestData.desiredOutput || 'text'; // Default to 'text' if not provided
    
    if (DEBUG) console.log(`[${new Date().toISOString()}][RequestID: ${requestId}] Request parameters:
      - id: ${id}
      - messages count: ${messages?.length || 0}
      - selectedChatModel: ${selectedChatModel}
      - desiredOutput: ${desiredOutput || 'undefined'}`);

    // Authenticate the user session
    const session = await auth();

    // Ensure user is authenticated
    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get the most recent message from the user
    const userMessage = getMostRecentUserMessage(messages);

    // Ensure there is a user message to process
    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    // Retrieve existing chat or create a new one
    const chat = await getChatById({ id });

    if (!chat) {
      // Generate a title for the new chat based on the user's message
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      // Save the new chat with generated title
      await saveChat({ id, userId: session.user.id, title });
    } else {
      // Verify the user has access to this chat
      if (chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
      
      // If this is a placeholder chat with the default title, update it with a generated title
      if (chat.title === 'New Chat') {
        if (DEBUG) console.log(`[${new Date().toISOString()}] Updating placeholder chat title for chat: ${id}`);
        
        // Generate a title for the chat based on the user's message
        const title = await generateTitleFromUserMessage({
          message: userMessage,
        });
        
        // Update the chat title
        await updateChatTitle({ id, title });
      }
    }

    // Save the user's message to the database
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          role: 'user',
          parts: userMessage.parts,
          attachments: userMessage.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    // Set up request context
    const userId = session.user?.id;
    if (DEBUG) console.log(`[${new Date().toISOString()}][RequestID: ${requestId}] Processing chat request for user ${userId}`);

    // Handle different output types (text/chat, image, embedding)
    if (!desiredOutput) {
      if (DEBUG) console.log(`[${new Date().toISOString()}][RequestID: ${requestId}] No desiredOutput specified, defaulting to 'text'`);
      desiredOutput = 'text';
    }
    
    if (DEBUG) console.log(`[${new Date().toISOString()}][RequestID: ${requestId}] Processing request with output type: ${desiredOutput}`);
    
    // ===== TEXT/CHAT OUTPUT HANDLING =====
    // Process standard text/chat responses using the AI model
    if (desiredOutput === 'text' || desiredOutput === 'chat') {
      if (DEBUG) console.log(`[${new Date().toISOString()}][RequestID: ${requestId}] Handling text/chat output type`);
      // Create a streaming response for text/chat output
      return createDataStreamResponse({
        execute: async (dataStream) => {
          // Get the model registry ID (provider:model format)
          if (DEBUG) console.log(`[${new Date().toISOString()}][RequestID: ${requestId}] Using model registry ID: ${selectedChatModel}`);

          // Extract complexPrompt from the user message if it exists
          let complexPrompt: string | undefined;
          
          // Check if complexPrompt exists in the userMessage
          if (userMessage && typeof userMessage === 'object') {
            // Try to access complexPrompt from different possible locations
            if ('complexPrompt' in userMessage) {
              complexPrompt = (userMessage as any).complexPrompt;
            } else if (userMessage.parts && Array.isArray(userMessage.parts)) {
              // Check if complexPrompt is in the parts metadata
              for (const part of userMessage.parts) {
                if (typeof part === 'object' && part && 'complexPrompt' in part) {
                  complexPrompt = (part as any).complexPrompt;
                  break;
                }
              }
            }
          }
          
          if (DEBUG) console.log(`[${new Date().toISOString()}][RequestID: ${requestId}] Using complexPrompt: ${complexPrompt ? 'Yes' : 'No'}`);
          
          // Stream text from the AI model
          if (DEBUG) console.log(`[DEBUG][${new Date().toISOString()}] About to use model: ${selectedChatModel}`);
          
          // Use our enhanced streamText function which handles model resolution internally
          if (DEBUG) console.log(`[DEBUG][${new Date().toISOString()}] Starting streamText with model: ${selectedChatModel}`);
          // Our enhanced streamText is now async, so we need to await it
          const resultPromise = streamText({
            model: selectedChatModel || 'quick',
            system: systemPrompt({
              selectedChatModel,
              complexPrompt
            }),
            messages,
            maxSteps: 5,
            // Configure active tools based on the selected model
            experimental_activeTools:
              selectedChatModel.includes('reasoning')
                ? []
                : [
                    'getWeather',
                    'createDocument',
                    'updateDocument',
                    'requestSuggestions',
                    'deleteFile',
                    'addMemory',
                    'getMemories',
                    'searchMemories',
                    'clearMemories',
                  ],
            experimental_transform: smoothStream({ chunking: 'word' }),
            experimental_generateMessageId: generateUUID,
            // Define available tools for the AI to use
            tools: {
              getWeather,
              createDocument: createDocument({ session, dataStream }),
              updateDocument: updateDocument({ session, dataStream }),
              deleteFile: deleteFileTool,
              requestSuggestions: requestSuggestions({
                session,
                dataStream,
              }),
              addMemory: tool({
                description: addMemoryTool.description,
                parameters: addMemoryTool.schema,
                execute: async (args: any, context: any) => {
                  const userId = session.user?.id || 'anonymous';
                  // Add userId to context for tool manager
                  context = { ...context, userId };
                  return await addMemoryTool.execute(args, userId);
                }
              }),
              getMemories: tool({
                description: getMemoriesTool.description,
                parameters: getMemoriesTool.schema,
                execute: async (args: any, context: any) => {
                  const userId = session.user?.id || 'anonymous';
                  // Add userId to context for tool manager
                  context = { ...context, userId };
                  return await getMemoriesTool.execute(args, userId);
                }
              }),
              searchMemories: tool({
                description: searchMemoriesTool.description,
                parameters: searchMemoriesTool.schema,
                execute: async (args: any, context: any) => {
                  const userId = session.user?.id || 'anonymous';
                  // Add userId to context for tool manager
                  context = { ...context, userId };
                  return await searchMemoriesTool.execute(args, userId);
                }
              }),
              clearMemories: tool({
                description: clearMemoriesTool.description,
                parameters: clearMemoriesTool.schema,
                execute: async (args: any, context: any) => {
                  const userId = session.user?.id || 'anonymous';
                  // Add userId to context for tool manager
                  context = { ...context, userId };
                  return await clearMemoriesTool.execute(args, userId);
                }
              }),
            },
            // Handle completion of the AI response
            onFinish: async ({ response }: { response: { messages: Array<{ role: string; id?: string; content?: string }> } }) => {
              if (session.user?.id) {
                try {
                  // Get the ID of the most recent assistant message
                  const assistantId = getTrailingMessageId({
                    messages: response.messages.filter(
                      (message: { role: string; content?: string }) => message.role === 'assistant',
                    ) as any, // Type assertion to bypass strict type checking
                  });

                  if (!assistantId) {
                    throw new Error('No assistant message found!');
                  }

                  // Append the assistant's response to the conversation
                  const [, assistantMessage] = appendResponseMessages({
                    messages: [userMessage],
                    responseMessages: response.messages as any, // Type assertion to bypass strict type checking
                  });

                  // Log the structure of the assistant message for debugging
                  if (DEBUG) console.log('[DEBUG] Assistant message structure:', JSON.stringify({
                    id: assistantId,
                    role: assistantMessage.role,
                    parts_type: typeof assistantMessage.parts,
                    parts_isArray: Array.isArray(assistantMessage.parts),
                    parts_length: Array.isArray(assistantMessage.parts) ? assistantMessage.parts.length : null,
                    parts_sample: Array.isArray(assistantMessage.parts) && assistantMessage.parts.length > 0
                      ? JSON.stringify(assistantMessage.parts[0])
                      : null
                  }, null, 2));

                  // Ensure each part has the required 'type' and 'text' fields
                  const normalizedParts = Array.isArray(assistantMessage.parts)
                    ? assistantMessage.parts.map(part => {
                        // If part already has both required fields, return it as is
                        if (part && typeof part === 'object' && 'type' in part && 'text' in part) {
                          return part;
                        }
                        
                        // If part has type but no text, add text field
                        if (part && typeof part === 'object' && 'type' in part && !('text' in part)) {
                          if (DEBUG) console.log('[DEBUG] Adding missing text field to part with type:', part.type);
                          return { ...part, text: '' };
                        }
                        
                        // If part is a string, convert to proper format
                        if (typeof part === 'string') {
                          if (DEBUG) console.log('[DEBUG] Converting string part to object with type and text');
                          return { type: 'text', text: part };
                        }
                        
                        // For any other case, create a default part
                        if (DEBUG) console.log('[DEBUG] Creating default part for unrecognized format:', typeof part);
                        return { type: 'text', text: JSON.stringify(part) };
                      })
                    : [{ type: 'text', text: 'No content available' }];

                  // Save the assistant's message to the database with normalized parts
                  await saveMessages({
                    messages: [
                      {
                        id: assistantId,
                        chatId: id,
                        role: assistantMessage.role,
                        parts: normalizedParts,
                        attachments:
                          assistantMessage.experimental_attachments ?? [],
                        createdAt: new Date(),
                      },
                    ],
                  });
                } catch (error) {
                  console.error('Failed to save chat');
                }
              }
            },
            // Configure telemetry for production environments
            experimental_telemetry: {
              isEnabled: isProductionEnvironment,
              functionId: 'stream-text',
            },
          });

          // Start consuming the stream
          if (DEBUG) console.log(`[DEBUG][${new Date().toISOString()}] Starting to consume stream`);
          try {
            // Await the promise to get the actual result object
            const result = await resultPromise;
            if (DEBUG) console.log(`[DEBUG][${new Date().toISOString()}] Result received, starting consumption`);
            
            // Now we can call methods on the actual result object
            result.consumeStream();
            if (DEBUG) console.log(`[DEBUG][${new Date().toISOString()}] Stream consumption started successfully`);
            
            // Merge the result into the data stream, including reasoning
            if (DEBUG) console.log(`[DEBUG][${new Date().toISOString()}] About to merge stream into data stream`);
            result.mergeIntoDataStream(dataStream, {
              sendReasoning: true,
            });
            if (DEBUG) console.log(`[DEBUG][${new Date().toISOString()}] Stream merged successfully`);
          } catch (error) {
            console.error(`[DEBUG][${new Date().toISOString()}] Error in stream processing:`, error);
            throw error;
          }
        },
        // Handle errors in the streaming process
        onError: (error) => {
          const errorId = generateUUID();
          console.error(`[${new Date().toISOString()}][ErrorID: ${errorId}] Error in stream processing:`, error);
          console.error(`[${new Date().toISOString()}][ErrorID: ${errorId}] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available');
          return `Oops, an error occurred! (Error ID: ${errorId})`;
        },
      });
    
    // ===== IMAGE GENERATION HANDLING =====
    // Process requests for AI-generated images from text prompts
    } else if(desiredOutput === 'image') {
      if (DEBUG) console.log(`[${new Date().toISOString()}][RequestID: ${requestId}] Handling image output type`);
      // Create a streaming response for image generation
      return createDataStreamResponse({
        execute: async (dataStream) => {
          try {
            // Extract the prompt from the user message - safely handle different part types
            let prompt = '';
            for (const part of userMessage.parts) {
              if (typeof part === 'string') {
                prompt = part;
                break;
              }
            }
            
            if (!prompt) {
              throw new Error('No text prompt found in user message');
            }
            
            // Log the prompt safely
            if (DEBUG) console.log(`[${new Date().toISOString()}][RequestID: ${requestId}] Generating image with prompt: ${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}`);
            
            // Generate the image using our enhanced function
            if (DEBUG) console.log(`[DEBUG][${new Date().toISOString()}] About to generate image with model: ${selectedChatModel}`);
            let image;
            try {
              // Use our enhanced experimental_generateImage function which handles model resolution internally
              const { image: generatedImage } = await experimental_generateImage({
                model: selectedChatModel,
                prompt,
              });
              image = generatedImage;
              if (DEBUG) console.log(`[DEBUG][${new Date().toISOString()}] Image generated successfully`);
            } catch (imageError) {
              console.error(`[DEBUG][${new Date().toISOString()}] Error generating image:`, imageError);
              throw imageError;
            }
            
            // Create an assistant message with the generated image
            const assistantId = generateUUID();
            
            // Save the assistant's message to the database
            await saveMessages({
              messages: [
                {
                  id: assistantId,
                  chatId: id,
                  role: 'assistant',
                  parts: [],
                  attachments: [{ type: 'image', image }],
                  createdAt: new Date(),
                },
              ],
            });
            
            // Create a result object similar to what streamText returns
            // This allows us to use the same mergeIntoDataStream pattern
            const result = {
              messages: [
                {
                  id: assistantId,
                  role: 'assistant',
                  content: '',
                  attachments: [{ type: 'image', image }]
                }
              ],
              mergeIntoDataStream: (ds: any) => {
                ds.update({
                  messages: result.messages
                });
              }
            };
            
            // Merge the result into the data stream
            result.mergeIntoDataStream(dataStream);
            
          } catch (error) {
            console.error(`[${new Date().toISOString()}][RequestID: ${requestId}] Error generating image:`, error);
            throw error;
          }
        },
        onError: (error) => {
          const errorId = generateUUID();
          console.error(`[${new Date().toISOString()}][ErrorID: ${errorId}] Error in image generation:`, error);
          console.error(`[${new Date().toISOString()}][ErrorID: ${errorId}] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available');
          return `Oops, an error occurred during image generation! (Error ID: ${errorId})`;
        },
      });
    
    // ===== EMBEDDING GENERATION HANDLING =====
    // Process requests for vector embeddings from text
    } else if(desiredOutput === 'embed') {
      if (DEBUG) console.log(`[${new Date().toISOString()}][RequestID: ${requestId}] Handling embed output type`);
      // Create a streaming response for embedding generation
      return createDataStreamResponse({
        execute: async (dataStream) => {
          try {
            // Extract the text to embed from the user message - safely handle different part types
            let textToEmbed = '';
            for (const part of userMessage.parts) {
              if (typeof part === 'string') {
                textToEmbed = part;
                break;
              }
            }
            
            if (!textToEmbed) {
              throw new Error('No text found in user message to embed');
            }
            
            // Log the text safely
            if (DEBUG) console.log(`[${new Date().toISOString()}][RequestID: ${requestId}] Generating embedding for text: ${textToEmbed.slice(0, 50)}${textToEmbed.length > 50 ? '...' : ''}`);
            // Generate text embeddings using our enhanced function
            if (DEBUG) console.log(`[DEBUG][${new Date().toISOString()}] About to generate embedding with model: ${selectedChatModel}`);
            let embedding;
            try {
              // Use our enhanced embed function which handles model resolution internally
              const { embedding: generatedEmbedding } = await embed({
                model: selectedChatModel,
                value: textToEmbed,
              });
  embedding = generatedEmbedding;
  if (DEBUG) console.log(`[DEBUG][${new Date().toISOString()}] Embedding generated successfully, length: ${embedding.length}`);
} catch (embedError) {
  console.error(`[DEBUG][${new Date().toISOString()}] Error generating embedding:`, embedError);
  throw embedError;
}

            
            // Create an assistant message with the embedding result
            const assistantId = generateUUID();
            const responseText = `Embedding generated successfully. Vector dimension: ${embedding.length}`;
            
            // Save the assistant's message to the database
            await saveMessages({
              messages: [
                {
                  id: assistantId,
                  chatId: id,
                  role: 'assistant',
                  parts: [responseText],
                  attachments: [],
                  createdAt: new Date(),
                },
              ],
            });
            
            // Create a result object similar to what streamText returns
            // This allows us to use the same mergeIntoDataStream pattern
            const result = {
              messages: [
                {
                  id: assistantId,
                  role: 'assistant',
                  content: responseText
                }
              ],
              mergeIntoDataStream: (ds: any) => {
                ds.update({
                  messages: result.messages,
                  data: { embedding }
                });
              }
            };
            
            // Merge the result into the data stream
            result.mergeIntoDataStream(dataStream);
            
          } catch (error) {
            console.error(`[${new Date().toISOString()}][RequestID: ${requestId}] Error generating embedding:`, error);
            throw error;
          }
        },
        onError: (error) => {
          const errorId = generateUUID();
          console.error(`[${new Date().toISOString()}][ErrorID: ${errorId}] Error in embedding generation:`, error);
          console.error(`[${new Date().toISOString()}][ErrorID: ${errorId}] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available');
          return `Oops, an error occurred during embedding generation! (Error ID: ${errorId})`;
        },
      });
    }
    
    // ===== UNSUPPORTED OUTPUT TYPE HANDLING =====
    // If we reach here without returning, it means an unsupported output type was requested
    if (DEBUG) console.log(`[${new Date().toISOString()}][RequestID: ${requestId}] Unsupported output type: ${desiredOutput}`);
    return new Response(
      JSON.stringify({
        error: 'Unsupported output type',
        message: `The output type '${desiredOutput}' is not supported`,
        requestId
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    // Generate a unique error ID for tracing
    const errorId = generateUUID();
    console.error(`[${new Date().toISOString()}][RequestID: ${requestId}][ErrorID: ${errorId}] Error in chat route:`, error);
    console.error(`[${new Date().toISOString()}][RequestID: ${requestId}][ErrorID: ${errorId}] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available');
    
    // Return a structured error response
    return new Response(
      JSON.stringify({
        error: 'Error processing chat request',
        errorId,
        requestId,
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * DELETE handler for chat API endpoint
 *
 * Handles deletion of chat conversations after verifying user ownership.
 * This endpoint ensures that:
 * 1. A valid chat ID is provided
 * 2. The user is authenticated
 * 3. The user owns the chat they're trying to delete
 *
 * URL format: DELETE /api/chat?id={chatId}
 *
 * Response codes:
 * - 200: Chat successfully deleted
 * - 401: Unauthorized (not logged in or not the chat owner)
 * - 404: Chat ID not provided
 * - 500: Server error during deletion
 */
export async function DELETE(request: Request) {
  // Extract chat ID from URL parameters
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // Ensure chat ID is provided
  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  // Authenticate the user session
  const session = await auth();

  // Ensure user is authenticated
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Retrieve the chat to verify ownership
    const chat = await getChatById({ id });

    // Verify the user owns this chat
    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Delete the chat from the database
    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    // Generate a unique error ID for tracing
    const errorId = generateUUID();
    console.error(`[${new Date().toISOString()}][ErrorID: ${errorId}] Error in DELETE chat route:`, error);
    console.error(`[${new Date().toISOString()}][ErrorID: ${errorId}] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available');
    
    // Return a structured error response
    return new Response(
      JSON.stringify({
        error: 'Error deleting chat',
        errorId,
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
