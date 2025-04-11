/**
 * User Authentication Database Functions
 * 
 * This module contains functions for user authentication operations:
 * - Retrieving users by email
 * - Creating new users with hashed passwords
 */

import 'server-only';
import { genSaltSync, hashSync } from 'bcrypt-ts';
import { eq } from 'drizzle-orm';

import { db } from '../connection';
import { user, type User } from '../schema';

/**
 * Get a user by email address
 * 
 * @param email - The email address to search for
 * @returns Promise resolving to an array of matching users (typically 0 or 1)
 */
export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

/**
 * Create a new user with the given email and password
 * 
 * @param email - The email address for the new user
 * @param password - The plain text password (will be hashed before storage)
 * @returns Promise resolving to the result of the insert operation
 */
export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}