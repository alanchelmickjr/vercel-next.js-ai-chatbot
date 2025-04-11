/**
 * Document Management Database Functions
 * 
 * This module contains functions for managing documents and suggestions:
 * - Creating, retrieving, and deleting documents
 * - Managing suggestions related to documents
 */

import 'server-only';
import { and, asc, desc, eq, gt } from 'drizzle-orm';

import { db } from '../connection';
import {
  document,
  suggestion,
  type Suggestion
} from '../schema';
import { ArtifactKind } from '@/components/artifact';

/**
 * Save a new document to the database
 * 
 * @param id - The unique ID for the document
 * @param title - The title of the document
 * @param kind - The kind of artifact (code, text, etc.)
 * @param content - The content of the document
 * @param userId - The ID of the user who owns the document
 * @returns Promise resolving to the result of the insert operation
 */
export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

/**
 * Get all documents with a specific ID
 * This may return multiple versions of the same document
 * 
 * @param id - The ID of the document(s) to retrieve
 * @returns Promise resolving to an array of documents, ordered by creation date (oldest first)
 */
export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

/**
 * Get the most recent version of a document with a specific ID
 * 
 * @param id - The ID of the document to retrieve
 * @returns Promise resolving to the document or undefined if not found
 */
export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

/**
 * Delete documents with a specific ID that were created after a specific timestamp
 * 
 * @param id - The ID of the document(s) to delete
 * @param timestamp - The timestamp after which documents should be deleted
 * @returns Promise resolving to the result of the delete operation
 */
export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    // First delete suggestions associated with these documents
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    // Then delete the documents themselves
    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

/**
 * Save suggestions to the database
 * 
 * @param suggestions - Array of suggestions to save
 * @returns Promise resolving to the result of the insert operation
 */
export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

/**
 * Get all suggestions for a specific document
 * 
 * @param documentId - The ID of the document
 * @returns Promise resolving to an array of suggestions
 */
export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}