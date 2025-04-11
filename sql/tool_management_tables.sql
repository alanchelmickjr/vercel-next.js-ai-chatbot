-- Tool Management System Tables
-- This file contains the SQL schema for the tool management system
-- It defines tables for tracking tool calls and pipelines

-- Tool call state tracking
CREATE TABLE IF NOT EXISTS "ToolCall" (
  "id" TEXT PRIMARY KEY,
  "userId" UUID,
  "chatId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "toolName" TEXT NOT NULL,
  "toolCallId" TEXT NOT NULL,
  "args" JSONB NOT NULL,
  "status" TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  "result" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "error" TEXT,
  "retryCount" INTEGER DEFAULT 0,
  "parentToolCallId" TEXT,
  "pipelineId" TEXT,
  "stepNumber" INTEGER
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "idx_toolcall_userid" ON "ToolCall" ("userId");
CREATE INDEX IF NOT EXISTS "idx_toolcall_chatid" ON "ToolCall" ("chatId");
CREATE INDEX IF NOT EXISTS "idx_toolcall_messageid" ON "ToolCall" ("messageId");
CREATE INDEX IF NOT EXISTS "idx_toolcall_toolcallid" ON "ToolCall" ("toolCallId");
CREATE INDEX IF NOT EXISTS "idx_toolcall_pipelineid" ON "ToolCall" ("pipelineId");
CREATE INDEX IF NOT EXISTS "idx_toolcall_status" ON "ToolCall" ("status");

-- Tool pipeline tracking
CREATE TABLE IF NOT EXISTS "ToolPipeline" (
  "id" TEXT PRIMARY KEY,
  "userId" UUID,
  "chatId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  "currentStep" INTEGER DEFAULT 0,
  "totalSteps" INTEGER NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "metadata" JSONB
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "idx_toolpipeline_userid" ON "ToolPipeline" ("userId");
CREATE INDEX IF NOT EXISTS "idx_toolpipeline_chatid" ON "ToolPipeline" ("chatId");
CREATE INDEX IF NOT EXISTS "idx_toolpipeline_status" ON "ToolPipeline" ("status");

-- Add a trigger to automatically update the updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW."updatedAt" = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_toolcall_updated_at
BEFORE UPDATE ON "ToolCall"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_toolpipeline_updated_at
BEFORE UPDATE ON "ToolPipeline"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments:
-- The ToolCall table tracks individual tool calls, their status, and results
-- The ToolPipeline table tracks multi-step tool pipelines and their progress
-- Both tables include timestamps for creation and updates
-- Both tables include an optional userId field to associate records with specific users when applicable
-- The userId field is nullable to allow system-initiated tool calls without a specific user
-- The ToolCall table includes fields for tracking retry attempts and errors
-- The ToolCall table can reference parent tool calls and pipelines for complex workflows