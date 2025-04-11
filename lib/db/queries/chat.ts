/**
 * Chat Management Database Functions
 * 
 * This module contains functions for managing chat-related operations:
 * - Creating, retrieving, and deleting chats
 * - Managing messages within chats
 * - Handling message voting
 * - Managing chat visibility
 */

import 'server-only';
import { and, asc, desc, eq, gt, gte, inArray } from 'drizzle-orm';

import { db } from '../connection';
import {
  chat,
  message,
  vote,
  type DBMessage
} from '../schema';

// Set to true to enable debug logging
const DEBUG = false;

/**
 * Save a new chat to the database
 * 
 * @param id - The unique ID for the chat
 * @param userId - The ID of the user who owns the chat
 * @param title - The title of the chat
 * @returns Promise resolving to the result of the insert operation
 */
export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

/**
 * Delete a chat and all its associated messages and votes
 * 
 * @param id - The ID of the chat to delete
 * @returns Promise resolving to the result of the delete operation
 */
export async function deleteChatById({ id }: { id: string }) {
  try {
    // First delete all votes associated with this chat
    await db.delete(vote).where(eq(vote.chatId, id));
    
    // Then delete all messages associated with this chat
    await db.delete(message).where(eq(message.chatId, id));

    // Finally delete the chat itself
    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

/**
 * Get all chats for a specific user
 * 
 * @param id - The ID of the user
 * @returns Promise resolving to an array of chats, ordered by creation date (newest first)
 */
export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

/**
 * Get a specific chat by its ID
 * 
 * @param id - The ID of the chat to retrieve
 * @returns Promise resolving to the chat or undefined if not found
 */
export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

/**
 * Save messages to the database
 * 
 * This function includes extensive validation and normalization to ensure
 * message data is properly formatted before insertion.
 * 
 * @param messages - Array of messages to save
 * @returns Promise resolving to the result of the insert operation
 */
export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    // EXTREMELY LOUD LOGGING - Use unique string for easy searching in logs
    console.log("*************** SAVING MESSAGES - FUNCTION ENTRY ***************");
    console.log("*************** MESSAGE COUNT:", messages.length);
    console.log("*************** MESSAGE ROLE:", messages[0]?.role);
    
    // Log full message structure for diagnosis
    console.log("*************** MESSAGE STRUCTURE DUMP START ***************");
    console.log(JSON.stringify({
      id: messages[0]?.id,
      chatId: messages[0]?.chatId,
      role: messages[0]?.role,
      parts_type: typeof messages[0]?.parts,
      parts_isArray: Array.isArray(messages[0]?.parts),
      parts_length: Array.isArray(messages[0]?.parts) ? messages[0]?.parts.length : null,
      attachments_type: typeof messages[0]?.attachments,
      attachments_isArray: Array.isArray(messages[0]?.attachments),
      attachments_length: Array.isArray(messages[0]?.attachments) ? messages[0]?.attachments.length : null,
      createdAt: messages[0]?.createdAt ? messages[0].createdAt.toISOString() : null
    }, null, 2));
    console.log("*************** MESSAGE STRUCTURE DUMP END ***************");
    
    // Compare with a user message structure if we have one from history
    if (messages[0]?.role === 'assistant') {
      console.log("*************** ASSISTANT MESSAGE DETECTED ***************");
      
      // Dump first part details if it exists
      if (messages[0]?.parts && Array.isArray(messages[0]?.parts) && messages[0]?.parts.length > 0) {
        const firstPart = messages[0].parts[0];
        console.log("*************** FIRST PART DETAILS:");
        console.log("First part type:", typeof firstPart);
        console.log("First part constructor:", firstPart && firstPart.constructor ? firstPart.constructor.name : 'N/A');
        if (firstPart && typeof firstPart === 'object') {
          console.log("First part keys:", Object.keys(firstPart).join(', '));
        }
      }
      
      // Try to find a user message from the database to compare structure
      try {
        console.log("*************** ATTEMPTING TO LOAD A USER MESSAGE FOR COMPARISON");
        setTimeout(async () => {
          try {
            // Try to query a sample user message from DB
            const userMessages = await db
              .select()
              .from(message)
              .where(eq(message.role, 'user'))
              .limit(1);
              
            if (userMessages && userMessages.length > 0) {
              console.log("*************** FOUND USER MESSAGE FOR COMPARISON");
              console.log("USER MESSAGE STRUCTURE:", JSON.stringify({
                id: userMessages[0].id,
                role: userMessages[0].role,
                parts_type: typeof userMessages[0].parts,
                parts_isArray: Array.isArray(userMessages[0].parts),
                parts_length: Array.isArray(userMessages[0].parts) ? userMessages[0].parts.length : null,
                parts_sample: Array.isArray(userMessages[0].parts) && userMessages[0].parts.length > 0
                  ? typeof userMessages[0].parts[0]
                  : null
              }, null, 2));
            } else {
              console.log("*************** NO USER MESSAGES FOUND FOR COMPARISON");
            }
          } catch (compareError) {
            console.error("*************** ERROR COMPARING WITH USER MESSAGE:", compareError);
          }
        }, 0);
      } catch (queryError) {
        console.error("*************** ERROR QUERYING USER MESSAGE:", queryError);
      }
    }
    
    // Validate that required fields are present
    const missingFields = messages.flatMap(msg => {
      const missing = [];
      if (!msg.chatId) missing.push('chatId');
      if (!msg.role) missing.push('role');
      if (!msg.parts) missing.push('parts');
      if (!msg.attachments) missing.push('attachments');
      if (!msg.createdAt) missing.push('createdAt');
      return missing.length ? [`Message ${msg.id || 'unknown'}: missing ${missing.join(', ')}`] : [];
    });
    
    if (missingFields.length > 0) {
      console.error('Message validation failed:', missingFields);
      throw new Error(`Message validation failed: ${missingFields.join('; ')}`);
    }
    
    // Additional type checking for parts field
    const typeErrors = messages.flatMap(msg => {
      const errors = [];
      if (!Array.isArray(msg.parts)) {
        console.error(`[DB DEBUG] Message ${msg.id || 'unknown'}: parts is not an array but ${typeof msg.parts}`);
        if (typeof msg.parts === 'object' && msg.parts !== null) {
          console.error(`[DB DEBUG] Parts keys:`, Object.keys(msg.parts));
        }
        errors.push(`Message ${msg.id || 'unknown'}: parts is not an array`);
      } else if (msg.parts.length === 0) {
        console.warn(`[DB DEBUG] Message ${msg.id || 'unknown'}: parts array is empty`);
      } else {
        // Log info about the first part
        const firstPart = msg.parts[0];
        console.log(`[DB DEBUG] First part type: ${typeof firstPart}`);
        if (typeof firstPart === 'object' && firstPart !== null) {
          console.log(`[DB DEBUG] First part keys: ${Object.keys(firstPart).join(', ')}`);
        }
      }
      
      // Validate that attachments is an array
      if (!Array.isArray(msg.attachments)) {
        errors.push(`Message ${msg.id || 'unknown'}: attachments is not an array`);
        console.error(`[DB DEBUG] Message ${msg.id || 'unknown'}: attachments is not an array but ${typeof msg.attachments}`);
      }
      
      return errors;
    });
    
    if (typeErrors.length > 0) {
      console.error('[DB DEBUG] Message type validation failed:', typeErrors);
      throw new Error(`Message type validation failed: ${typeErrors.join('; ')}`);
    }
    
    // Add more specific validation for parts and attachments structure
    const structureErrors = messages.flatMap(msg => {
      const errors = [];
      
      // Check parts structure
      if (Array.isArray(msg.parts)) {
        // Validate each part has the expected structure
        for (let i = 0; i < msg.parts.length; i++) {
          const part = msg.parts[i];
          if (typeof part !== 'object' || part === null) {
            errors.push(`Message ${msg.id || 'unknown'}: parts[${i}] is not an object`);
          } else if (!('type' in part) || !('text' in part)) {
            errors.push(`Message ${msg.id || 'unknown'}: parts[${i}] missing required fields`);
          }
        }
      }
      
      return errors;
    });
    
    if (structureErrors.length > 0) {
      console.error('Message structure validation failed:', structureErrors);
      throw new Error(`Message structure validation failed: ${structureErrors.join('; ')}`);
    }
    
    // Normalize message structure if needed
    const normalizedMessages = messages.map(msg => {
      // Ensure parts is an array
      const parts = Array.isArray(msg.parts) ? msg.parts : [];
      
      // Ensure attachments is an array
      const attachments = Array.isArray(msg.attachments) ? msg.attachments : [];
      
      return {
        ...msg,
        parts,
        attachments
      };
    });
    
    // Enhanced debugging for database operations
    console.log(`[DB DEBUG] Attempting to insert ${normalizedMessages.length} message(s) with role: ${normalizedMessages[0]?.role}`);
    
    // Create a SQL representation for debugging
    try {
      const sqlQuery = db.insert(message).values(normalizedMessages).toSQL();
      console.log('[DB DEBUG] SQL query:', sqlQuery.sql);
      console.log('[DB DEBUG] Parameters:', JSON.stringify(sqlQuery.params));
    } catch (sqlError) {
      console.error('[DB DEBUG] Error creating SQL representation:', sqlError);
    }
    
    // Execute the actual insert with normalized data
    try {
      const result = await db.insert(message).values(normalizedMessages);
      console.log('[DB DEBUG] Insert operation returned:', result);
      
      // Verify the message was actually inserted
      try {
        const savedMessage = await db.select().from(message).where(eq(message.id, normalizedMessages[0].id));
        if (savedMessage.length > 0) {
          console.log(`[DB DEBUG] Message with ID ${normalizedMessages[0].id} was successfully retrieved after insert`);
        } else {
          console.error(`[DB DEBUG] CRITICAL: Message with ID ${normalizedMessages[0].id} was NOT found after insert!`);
        }
      } catch (verifyError) {
        console.error('[DB DEBUG] Error verifying message insertion:', verifyError);
      }
      
      return result;
    } catch (insertError) {
      // More specific error handling
      const dbError = insertError as any; // Type assertion for database errors
      if (dbError.code === '23502') { // NOT NULL violation
        console.error('[DB DEBUG] NOT NULL constraint violation:', insertError);
        throw new Error('Message is missing required fields');
      } else if (dbError.code === '22P02') { // Invalid input syntax
        console.error('[DB DEBUG] Invalid input syntax:', insertError);
        throw new Error('Message contains invalid data format');
      } else {
        console.error('[DB DEBUG] Insert operation failed:', insertError);
        throw insertError;
      }
    }
  } catch (error) {
    console.error('Failed to save messages in database', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      // Wrap the error with a more user-friendly message
      throw new Error(`Failed to save message: ${error.message}`);
    } else {
      // Handle non-Error objects
      throw new Error('Failed to save message: Unknown database error');
    }
  }
}

/**
 * Get all messages for a specific chat
 * 
 * @param id - The ID of the chat
 * @returns Promise resolving to an array of messages, ordered by creation date (oldest first)
 */
export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

/**
 * Vote on a message (upvote or downvote)
 * 
 * @param chatId - The ID of the chat containing the message
 * @param messageId - The ID of the message to vote on
 * @param type - The type of vote ('up' or 'down')
 * @returns Promise resolving to the result of the insert or update operation
 */
export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    // Check if a vote already exists for this message
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      // Update the existing vote
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    
    // Create a new vote
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

/**
 * Get all votes for a specific chat
 * 
 * @param id - The ID of the chat
 * @returns Promise resolving to an array of votes
 */
export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

/**
 * Get a specific message by its ID
 * 
 * @param id - The ID of the message to retrieve
 * @returns Promise resolving to the message or undefined if not found
 */
export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

/**
 * Delete messages from a chat that were created after a specific timestamp
 * 
 * @param chatId - The ID of the chat
 * @param timestamp - The timestamp after which messages should be deleted
 * @returns Promise resolving to the result of the delete operation
 */
export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    // Find all messages to delete
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      // First delete votes associated with these messages
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      // Then delete the messages themselves
      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

/**
 * Update the visibility of a chat
 * 
 * @param chatId - The ID of the chat
 * @param visibility - The new visibility setting ('private' or 'public')
 * @returns Promise resolving to the result of the update operation
 */
export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}

/**
 * Create a placeholder chat in the database
 *
 * This function creates a placeholder chat entry when a new chat ID is generated.
 * It ensures that the chat exists in the database even if the user doesn't submit a message.
 * This prevents 404 errors when users refresh or navigate away before submitting a message.
 *
 * @param id - The unique ID for the chat
 * @param userId - The ID of the user who owns the chat
 * @returns Promise resolving to the result of the insert operation
 */
export async function createPlaceholderChat({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    console.log(`[${new Date().toISOString()}] Creating placeholder chat: ${id} for user: ${userId}`);
    
    // Check if the chat already exists
    const existingChat = await getChatById({ id });
    if (existingChat) {
      console.log(`[${new Date().toISOString()}] Chat ${id} already exists, skipping placeholder creation`);
      return;
    }
    
    // Create a placeholder chat with a temporary title
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title: 'New Chat',
      visibility: 'private',
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to create placeholder chat in database:`, error);
    // Don't throw the error - we don't want to break the user experience if this fails
    // Just log it and continue
  }
}

/**
 * Update the title of a chat
 *
 * @param id - The ID of the chat to update
 * @param title - The new title for the chat
 * @returns Promise resolving to the result of the update operation
 */
export async function updateChatTitle({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  try {
    console.log(`[${new Date().toISOString()}] Updating chat title: ${id} to: ${title}`);
    return await db.update(chat).set({ title }).where(eq(chat.id, id));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to update chat title in database:`, error);
    throw error;
  }
}