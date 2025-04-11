/**
 * Database Connection Module
 * 
 * This module establishes the connection to the PostgreSQL database using Drizzle ORM.
 * It exports the database client that can be used across the application for database operations.
 */

import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Initialize PostgreSQL client with connection string from environment variables
// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);

// Create and export the Drizzle ORM instance
export const db = drizzle(client);