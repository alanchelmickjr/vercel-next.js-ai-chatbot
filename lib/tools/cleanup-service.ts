/**
 * Tool Cleanup Service
 * 
 * This module provides a service for cleaning up stale, failed, or orphaned tool calls and pipelines.
 * It runs periodically to:
 * - Clean up stale tool calls that have been pending or processing for too long
 * - Clean up stale pipelines that have been pending or processing for too long
 * - Log cleanup activities for monitoring
 */

import { cleanupStaleToolCalls, cleanupStaleToolPipelines } from '@/lib/db/queries/tool-state';

// Configuration
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const STALE_THRESHOLD_HOURS = 24; // Consider tool calls stale after 24 hours

// Set to true to enable debug logging
const DEBUG = false;

/**
 * Cleanup Service class
 * 
 * Provides methods for cleaning up stale tool calls and pipelines
 */
export class CleanupService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the cleanup service
   * 
   * This method starts a periodic cleanup process that runs at the configured interval.
   */
  public start(): void {
    if (this.isRunning) {
      if (DEBUG) console.log('Cleanup service is already running');
      return;
    }

    if (DEBUG) console.log('Starting tool cleanup service');
    this.isRunning = true;

    // Run cleanup immediately on start
    this.runCleanup();

    // Set up periodic cleanup
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop the cleanup service
   * 
   * This method stops the periodic cleanup process.
   */
  public stop(): void {
    if (!this.isRunning) {
      if (DEBUG) console.log('Cleanup service is not running');
      return;
    }

    if (DEBUG) console.log('Stopping tool cleanup service');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Run cleanup process
   * 
   * This method performs the actual cleanup of stale tool calls and pipelines.
   */
  private async runCleanup(): Promise<void> {
    try {
      if (DEBUG) console.log('Running tool cleanup process');

      // Calculate the stale threshold date
      const staleThreshold = new Date();
      staleThreshold.setHours(staleThreshold.getHours() - STALE_THRESHOLD_HOURS);

      // Clean up stale tool calls
      const toolCallsDeleted = await cleanupStaleToolCalls(staleThreshold);
      if (DEBUG) console.log(`Cleaned up ${toolCallsDeleted} stale tool calls`);

      // Clean up stale pipelines
      const pipelinesDeleted = await cleanupStaleToolPipelines(staleThreshold);
      if (DEBUG) console.log(`Cleaned up ${pipelinesDeleted} stale pipelines`);

      // Log cleanup summary
      if (toolCallsDeleted > 0 || pipelinesDeleted > 0) {
        console.log(`[${new Date().toISOString()}] Tool cleanup summary: ${toolCallsDeleted} tool calls and ${pipelinesDeleted} pipelines deleted`);
      }
    } catch (error) {
      console.error('Error in tool cleanup process:', error);
    }
  }
}

// Export a singleton instance
export const cleanupService = new CleanupService();

// Auto-start the cleanup service in production
if (process.env.NODE_ENV === 'production') {
  cleanupService.start();
}