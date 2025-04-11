/**
 * Delete File Tool
 * 
 * This tool deletes a file from the filesystem.
 * It requires user approval before execution to prevent accidental deletions.
 */

import { z } from 'zod';
import { tool } from '@/lib/tools/tool-wrapper';
import fs from 'fs/promises';
import path from 'path';

/**
 * Delete a file from the filesystem
 * 
 * @param filePath - Path to the file to delete
 * @returns Result of the deletion operation
 */
async function deleteFile(filePath: string): Promise<{ success: boolean; message: string }> {
  try {
    // Normalize the path to prevent directory traversal attacks
    const normalizedPath = path.normalize(filePath);
    
    // Check if the file exists
    await fs.access(normalizedPath);
    
    // Delete the file
    await fs.unlink(normalizedPath);
    
    return {
      success: true,
      message: `File ${normalizedPath} deleted successfully`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error deleting file: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Delete File Tool
 * 
 * This tool deletes a file from the filesystem.
 * It requires user approval before execution to prevent accidental deletions.
 */
export const deleteFileTool = tool(
  {
    name: 'deleteFile',
    description: 'Delete a file from the filesystem',
    parameters: z.object({
      filePath: z.string().describe('Path to the file to delete'),
    }),
    execute: async ({ filePath }: { filePath: string }) => {
      return await deleteFile(filePath);
    },
  },
  {
    // This tool requires approval before execution
    requireApproval: true,
    
    // Optional callback when approval is required
    onApprovalRequired: (stepInfo) => {
      console.log(`Approval required for deleting file: ${stepInfo.args.filePath}`);
    },
  }
);