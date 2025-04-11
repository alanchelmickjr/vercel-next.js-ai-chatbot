# Human-in-the-Loop (HITL) for Tool Execution

This document explains how to use the Human-in-the-Loop (HITL) functionality for tool execution in the chat.talkverse.ai application.

## Overview

Human-in-the-Loop (HITL) functionality allows users to approve or reject tool executions before they are performed. This is useful for:

- Security: Preventing unauthorized tool executions
- Control: Giving users control over what tools are executed
- Transparency: Making it clear what tools are being executed and with what parameters

## How It Works

1. When a tool requires approval, it enters the `AWAITING_APPROVAL` state
2. The multimodal-input component displays an inline approval UI
3. The user can approve or reject the tool execution
4. On approval, the tool is executed and the result is displayed
5. On rejection, the tool is marked as rejected and no execution occurs
6. All events are streamed in real-time using SSE (Server-Sent Events)
7. The multimodal input component automatically detects and displays approval requests

## Architecture

The HITL functionality is implemented using a client-server architecture:

### Client-Side Components

1. **HITL Client Utilities (`lib/tools/hitl-client.ts`)**
   - Provides client-side utilities for tool approval
   - Uses the existing `/api/tools/status` API for updating tool status

2. **Tool Approval Hook (`hooks/use-tool-approval.ts`)**
   - Provides a React hook for approving/rejecting tools
   - Uses the HITL client utilities
3. **Multimodal Input Integration (`components/multimodal-input.tsx`)**
   - Detects pending tool approvals from the tool state
   - Displays the approval UI inline within the input component
   - Handles approval/rejection actions
   - Provides a seamless user experience for tool approval

4. **Tool Approval UI (`components/tool-approval-inline.tsx`)**
   - Displays an inline UI for tool approval
   - Integrated with the multimodal input component
   - Integrated with the multimodal input component

### Server-Side Components

1. **Tool Wrapper (`lib/tools/tool-wrapper.ts`)**
   - Supports the `requireApproval` option for tools
   - Sets tool calls to `AWAITING_APPROVAL` status when approval is required

2. **Tool Status API (`app/api/tools/status/route.ts`)**
   - Provides endpoints for checking and updating tool status
   - Handles tool approval and rejection actions

## Implementation Details

### Tool Wrapper

Tools can be configured to require approval by setting the `requireApproval` option to `true`:

```typescript
const getWeather = tool({
  description: 'Get the current weather at a location',
  parameters: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  requireApproval: true, // This tool requires approval
  execute: async ({ latitude, longitude }) => {
    // Tool implementation
  }
});
```

### Tool Status Flow (Client-Server Interaction)

The tool status flow for tools requiring approval is:

1. `PENDING` - Initial state when the tool is called
2. `AWAITING_APPROVAL` - Waiting for user approval
3. `PROCESSING` - Tool is being executed (after approval)
4. `COMPLETED` - Tool execution completed successfully
5. `REJECTED` - Tool execution was rejected by the user
6. `FAILED` - Tool execution failed

### API Endpoints

The HITL functionality uses the following API endpoints:

1. **GET /api/tools/status**
   - Gets the current status of a tool call
   - Used for checking if a tool call requires approval

2. **POST /api/tools/status**
   - Updates the status of a tool call
   - Used for approving or rejecting tool calls

### UI Components

The HITL functionality includes the following UI components:

- `ToolApprovalInline` - Displays an inline approval UI within the multimodal input component

### Client Utility Functions

The HITL functionality includes the following utility functions:

- `toolRequiresApproval` - Checks if a tool requires approval
- `setToolCallAwaitingApproval` - Sets a tool call to awaiting approval
- `approveToolCall` - Approves a tool call
- `rejectToolCall` - Rejects a tool call
- `getToolsRequiringApproval` - Gets all tools that require approval
- `getToolCallsRequiringApproval` - Gets all tool calls that require approval

## Usage Examples

### 1. Configuring a Tool to Require Approval

```typescript
import { tool } from '@/lib/tools/tool-wrapper';
import { z } from 'zod';

export const getWeather = tool({
  description: 'Get the current weather at a location',
  parameters: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  requireApproval: true, // This tool requires approval
  execute: async ({ latitude, longitude }) => {
    // Tool implementation
  }
});
```

### 2. Using the HITL Hook

```typescript
import { useToolApproval } from '@/hooks/use-tool-approval';

function MyComponent() {
  const { approveToolExecution, rejectToolExecution } = useToolApproval({
    onApproved: (toolCallId) => {
      console.log(`Tool ${toolCallId} approved`);
    },
    onRejected: (toolCallId) => {
      console.log(`Tool ${toolCallId} rejected`);
    }
  });

  // Use the hook functions to approve or reject tool executions
}
```

### 3. Approving/Rejecting a Tool Call via API

```typescript
// Approve a tool call
const approveToolCall = async (toolCallId: string) => {
  const response = await fetch('/api/tools/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      toolCallId,
      status: 'PROCESSING',
      action: 'approve',
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to approve tool call');
  }
  
  return await response.json();
};

// Reject a tool call
const rejectToolCall = async (toolCallId: string) => {
  const response = await fetch('/api/tools/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      toolCallId,
      status: 'REJECTED',
      action: 'reject',
      error: 'Tool execution rejected by user',
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to reject tool call');
  }
  
  return await response.json();
};
```

## Best Practices

1. **Be Selective**: Only require approval for tools that need it (e.g., tools that modify data or access sensitive information)
2. **Clear UI**: Make it clear to users what they're approving and what the consequences are
3. **Provide Context**: Show users the tool name, description, and parameters to help them make informed decisions
4. **Handle Rejections**: Have a plan for what happens when a tool is rejected
5. **Timeout Handling**: Consider what happens if a user doesn't respond to an approval request

## Integration with Multimodal Input

The multimodal input component is a key part of the HITL implementation. It:

1. **Detects Pending Approvals**: Uses the `pendingToolApprovals` state to track tools awaiting approval
2. **Displays Approval UI**: Renders the `ToolApprovalInline` component when approvals are pending
3. **Handles User Actions**: Processes approval/rejection actions and updates the UI accordingly
4. **Manages State**: Clears approvals after they're handled to maintain a clean UI

This integration ensures that users are prompted for approval at the right time, without disrupting their workflow. The approval UI appears directly in the input area, making it clear what action is being requested.

```tsx
// Example of how the multimodal input component handles tool approvals
{pendingToolApprovals.length > 0 && (
  <div className="flex flex-col gap-2">
    {pendingToolApprovals.map((toolCall) => (
      <ToolApprovalInline
        key={toolCall.id}
        toolCall={toolCall}
        onComplete={handleToolApprovalComplete}
      />
    ))}
  </div>
)}
```

## Community Suggestion Actions

The HITL functionality is particularly valuable when used with Community Suggestion Actions:

1. When a user selects a community suggestion that involves potentially destructive actions (like file deletion)
2. The action is executed with the `requireApproval: true` option
3. The multimodal input component detects the pending approval and displays the approval UI
4. The user can review the action details and approve or reject it
5. This prevents accidental execution of destructive actions from community suggestions

## Implementation Notes

1. **No Additional API Endpoints**
   - The HITL functionality leverages the existing `/api/tools/status` API
   - This avoids creating unnecessary endpoints and keeps the codebase DRY

2. **Client-Server Separation**
   - Client-side code uses the `hitl-client.ts` utilities
   - Server-side code uses the `tool-wrapper.ts` functionality
   - This separation avoids importing server-only modules in client components

3. **Event-Driven Architecture**
   - The HITL functionality uses the existing SSE infrastructure for real-time updates
   - This allows for a responsive user experience without polling

## Conclusion

The Human-in-the-Loop (HITL) functionality provides a powerful way to give users control over tool executions. By requiring approval for sensitive operations, you can build more secure and transparent applications.