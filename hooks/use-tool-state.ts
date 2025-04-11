/*
 * Created by Alan Helmick aka: crackerJack and Claude 3.7 via Roo
 * All rights applicable beyond open source reserved
 * Copyright Mira AI LLC 2025
 */

/**
 * Tool State Hook
 * 
 * This hook provides client-side access to tool call states and pipelines.
 * It allows components to:
 * - Track tool call status
 * - Monitor pipeline progress
 * - Receive updates when tool states change
 * 
 * Usage:
 * ```tsx
 * // Track a single tool call
 * const { toolCall, isCompleted, isFailed } = useToolCall(toolCallId);
 * 
 * // Track a pipeline of tool calls
 * const { pipeline, toolCalls, progress } = useToolPipeline(pipelineId);
 * 
 * // Track all tool calls for a chat
 * const { toolCalls, completedCalls } = useChatToolCalls(chatId);
 * 
 * // Track all pipelines for a chat
 * const { pipelines, processingPipelines } = useChatToolPipelines(chatId);
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { useToolEvents } from '@/hooks/use-tool-events';

import { ToolCall, ToolPipeline, ToolStatus } from '@/lib/db/schema-tool-state';

/**
 * Fetcher function for SWR
 * Handles API requests and error handling for tool state data
 * 
 * @param url - The API endpoint URL to fetch data from
 * @returns The parsed JSON response
 * @throws Error if the fetch fails
 */
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch tool state');
  }
  return res.json();
};

/**
 * Hook for tracking a specific tool call
 * 
 * Provides real-time updates on the status of a single tool call,
 * combining initial data fetching with SSE-based updates.
 * 
 * @param toolCallId - The tool call ID to track
 * @returns Tool call state and helper functions
 */
export function useToolCall(toolCallId: string | null) {
  // Use SWR for initial data fetch and fallback
  const { data: initialData, error, mutate } = useSWR(
    toolCallId ? `/api/tools/status?toolCallId=${toolCallId}` : null,
    fetcher,
    {
      // No polling - rely on SSE events
      revalidateOnFocus: true,
    }
  );
  
  // Store the tool call state locally
  const [toolCall, setToolCall] = useState<ToolCall | undefined>(initialData);
  
  // Track if we've received the initial data
  const initialDataReceived = useRef(false);
  
  // Update local state when SWR data changes
  useEffect(() => {
    if (initialData) {
      setToolCall(initialData);
      initialDataReceived.current = true;
    }
  }, [initialData]);
  
  // Handle tool call updates from events
  const handleToolCallUpdated = useCallback((updatedToolCall: ToolCall) => {
    if (updatedToolCall.id === toolCallId) {
      setToolCall(updatedToolCall);
      // Also update the SWR cache to keep it in sync
      mutate(updatedToolCall, false);
    }
  }, [toolCallId, mutate]);
  
  // Subscribe to tool events for this tool call
  const chatId = toolCall?.chatId || null;
  useToolEvents({
    chatId,
    onToolCallUpdated: handleToolCallUpdated,
    // Only enable events after we've received initial data to prevent race conditions
    enabled: !!chatId && initialDataReceived.current,
  });
  
  // Derived state for common status checks
  const isLoading = !error && !toolCall;
  const isCompleted = toolCall?.status === ToolStatus.COMPLETED;
  const isFailed = toolCall?.status === ToolStatus.FAILED;
  const isProcessing = toolCall?.status === ToolStatus.PROCESSING;
  const isPending = toolCall?.status === ToolStatus.PENDING;
  
  // Force refresh the tool call state
  const refreshToolCall = useCallback(() => {
    if (toolCallId) {
      mutate();
    }
  }, [toolCallId, mutate]);
  
  return {
    toolCall,
    isLoading,
    isCompleted,
    isFailed,
    isProcessing,
    isPending,
    error,
    refreshToolCall,
  };
}

/**
 * Hook for tracking a tool pipeline
 * 
 * Provides real-time updates on the status of a pipeline and its tool calls,
 * combining initial data fetching with SSE-based updates.
 * 
 * @param pipelineId - The pipeline ID to track
 * @returns Pipeline state and helper functions
 */
export function useToolPipeline(pipelineId: string | null) {
  // Use SWR for initial data fetch of pipeline metadata
  const { data: initialPipeline, error: pipelineError, mutate: mutatePipeline } = useSWR(
    pipelineId ? `/api/tools/pipeline/status?pipelineId=${pipelineId}` : null,
    fetcher,
    {
      // No polling - rely on SSE events
      revalidateOnFocus: true,
    }
  );
  
  // Use SWR for initial data fetch of pipeline tool calls
  const { data: initialToolCalls, error: toolCallsError, mutate: mutateToolCalls } = useSWR(
    pipelineId ? `/api/tools/pipeline/calls?pipelineId=${pipelineId}` : null,
    fetcher,
    {
      // No polling - rely on SSE events
      revalidateOnFocus: true,
    }
  );
  
  // Store the pipeline and tool calls state locally
  const [pipeline, setPipeline] = useState<ToolPipeline | undefined>(initialPipeline);
  const [toolCalls, setToolCalls] = useState<ToolCall[] | undefined>(initialToolCalls);
  
  // Track if we've received the initial data
  const initialDataReceived = useRef(false);
  
  // Update local state when SWR data changes
  useEffect(() => {
    if (initialPipeline) {
      setPipeline(initialPipeline);
      initialDataReceived.current = true;
    }
  }, [initialPipeline]);
  
  useEffect(() => {
    if (initialToolCalls) {
      setToolCalls(initialToolCalls);
    }
  }, [initialToolCalls]);
  
  // Handle pipeline updates from events
  const handlePipelineUpdated = useCallback((updatedPipeline: ToolPipeline) => {
    if (updatedPipeline.id === pipelineId) {
      setPipeline(updatedPipeline);
      // Also update the SWR cache to keep it in sync
      mutatePipeline(updatedPipeline, false);
    }
  }, [pipelineId, mutatePipeline]);
  
  // Handle tool call updates from events
  const handleToolCallUpdated = useCallback((updatedToolCall: ToolCall) => {
    if (updatedToolCall.pipelineId === pipelineId) {
      setToolCalls((prevToolCalls) => {
        if (!prevToolCalls) return [updatedToolCall];
        
        // Replace the tool call if it exists, otherwise add it
        const index = prevToolCalls.findIndex(tc => tc.id === updatedToolCall.id);
        if (index >= 0) {
          const newToolCalls = [...prevToolCalls];
          newToolCalls[index] = updatedToolCall;
          return newToolCalls;
        } else {
          return [...prevToolCalls, updatedToolCall];
        }
      });
      
      // Also update the SWR cache
      mutateToolCalls();
    }
  }, [pipelineId, mutateToolCalls]);
  
  // Subscribe to tool events for this pipeline
  const chatId = pipeline?.chatId || null;
  useToolEvents({
    chatId,
    onToolPipelineUpdated: handlePipelineUpdated,
    onToolCallUpdated: handleToolCallUpdated,
    // Only enable events after we've received initial data to prevent race conditions
    enabled: !!chatId && initialDataReceived.current,
  });
  
  // Derived state for common status checks
  const isLoading = (!pipelineError && !pipeline) || (!toolCallsError && !toolCalls);
  const isCompleted = pipeline?.status === ToolStatus.COMPLETED;
  const isFailed = pipeline?.status === ToolStatus.FAILED;
  const isProcessing = pipeline?.status === ToolStatus.PROCESSING;
  const isPending = pipeline?.status === ToolStatus.PENDING;
  
  // Calculate progress percentage based on current step and total steps
  const progress = pipeline 
    ? Math.round(((pipeline.currentStep || 0) / (pipeline.totalSteps || 1)) * 100)
    : 0;
  
  // Force refresh the pipeline state
  const refreshPipeline = useCallback(() => {
    if (pipelineId) {
      mutatePipeline();
      mutateToolCalls();
    }
  }, [pipelineId, mutatePipeline, mutateToolCalls]);
  
  return {
    pipeline,
    toolCalls,
    isLoading,
    isCompleted,
    isFailed,
    isProcessing,
    isPending,
    progress,
    error: pipelineError || toolCallsError,
    refreshPipeline,
  };
}

/**
 * Hook for tracking all tool calls for a chat
 * 
 * Provides real-time updates on all tool calls associated with a chat,
 * combining initial data fetching with SSE-based updates.
 * 
 * @param chatId - The chat ID
 * @returns Array of tool calls and helper functions
 */
export function useChatToolCalls(chatId: string | null) {
  // Use SWR for initial data fetch and fallback
  const { data: initialData, error, mutate } = useSWR(
    chatId ? `/api/tools/chat?chatId=${chatId}` : null,
    fetcher,
    {
      // No polling - rely on SSE events
      revalidateOnFocus: true,
      // Don't retry on 500 errors - likely means the chat doesn't exist yet
      shouldRetryOnError: (err) => !(err && 'status' in err && err.status === 500),
    }
  );
  
  // Store the tool calls state locally
  const [toolCalls, setToolCalls] = useState<ToolCall[] | undefined>(initialData);
  
  // Track if we've received the initial data
  const initialDataReceived = useRef(false);
  
  // Update local state when SWR data changes
  useEffect(() => {
    if (initialData) {
      setToolCalls(initialData);
      initialDataReceived.current = true;
    }
  }, [initialData]);
  
  // Handle tool call updates from events
  const handleToolCallUpdated = useCallback((updatedToolCall: ToolCall) => {
    if (updatedToolCall.chatId === chatId) {
      setToolCalls((prevToolCalls) => {
        if (!prevToolCalls) return [updatedToolCall];
        
        // Replace the tool call if it exists, otherwise add it
        const index = prevToolCalls.findIndex(tc => tc.id === updatedToolCall.id);
        if (index >= 0) {
          const newToolCalls = [...prevToolCalls];
          newToolCalls[index] = updatedToolCall;
          return newToolCalls;
        } else {
          return [...prevToolCalls, updatedToolCall];
        }
      });
      
      // Also update the SWR cache
      mutate();
    }
  }, [chatId, mutate]);
  
  // Handle chat tools updated event (e.g., when a new tool call is created)
  const handleChatToolsUpdated = useCallback((update: { type: string, id: string }) => {
    if (update.type === 'tool-call') {
      // Refresh the tool calls list
      mutate();
    }
  }, [mutate]);
  
  // Subscribe to tool events for this chat
  useToolEvents({
    chatId,
    onToolCallUpdated: handleToolCallUpdated,
    onChatToolsUpdated: handleChatToolsUpdated,
    // Only enable events after we've received initial data to prevent race conditions
    enabled: !!chatId && initialDataReceived.current,
  });
  
  const isLoading = !error && !toolCalls;
  
  // Group tool calls by status for easier filtering in UI components
  const completedCalls = toolCalls?.filter((call: ToolCall) => call.status === ToolStatus.COMPLETED) || [];
  const failedCalls = toolCalls?.filter((call: ToolCall) => call.status === ToolStatus.FAILED) || [];
  const processingCalls = toolCalls?.filter((call: ToolCall) => call.status === ToolStatus.PROCESSING) || [];
  const pendingCalls = toolCalls?.filter((call: ToolCall) => call.status === ToolStatus.PENDING) || [];
  
  // Force refresh the tool calls
  const refreshToolCalls = useCallback(() => {
    if (chatId) {
      mutate();
    }
  }, [chatId, mutate]);
  
  return {
    toolCalls,
    completedCalls,
    failedCalls,
    processingCalls,
    pendingCalls,
    isLoading,
    error,
    refreshToolCalls,
  };
}

/**
 * Hook for tracking all tool pipelines for a chat
 * 
 * Provides real-time updates on all pipelines associated with a chat,
 * combining initial data fetching with SSE-based updates.
 * 
 * @param chatId - The chat ID
 * @returns Array of pipelines and helper functions
 */
export function useChatToolPipelines(chatId: string | null) {
  // Use SWR for initial data fetch and fallback
  const { data: initialData, error, mutate } = useSWR(
    chatId ? `/api/tools/pipeline/chat?chatId=${chatId}` : null,
    fetcher,
    {
      // No polling - rely on SSE events
      revalidateOnFocus: true,
      // Don't retry on 500 errors - likely means the chat doesn't exist yet
      shouldRetryOnError: (err) => !(err && 'status' in err && err.status === 500),
    }
  );
  
  // Store the pipelines state locally
  const [pipelines, setPipelines] = useState<ToolPipeline[] | undefined>(initialData);
  
  // Track if we've received the initial data
  const initialDataReceived = useRef(false);
  
  // Update local state when SWR data changes
  useEffect(() => {
    if (initialData) {
      setPipelines(initialData);
      initialDataReceived.current = true;
    }
  }, [initialData]);
  
  // Handle pipeline updates from events
  const handlePipelineUpdated = useCallback((updatedPipeline: ToolPipeline) => {
    if (updatedPipeline.chatId === chatId) {
      setPipelines((prevPipelines) => {
        if (!prevPipelines) return [updatedPipeline];
        
        // Replace the pipeline if it exists, otherwise add it
        const index = prevPipelines.findIndex(p => p.id === updatedPipeline.id);
        if (index >= 0) {
          const newPipelines = [...prevPipelines];
          newPipelines[index] = updatedPipeline;
          return newPipelines;
        } else {
          return [...prevPipelines, updatedPipeline];
        }
      });
      
      // Also update the SWR cache
      mutate();
    }
  }, [chatId, mutate]);
  
  // Handle chat tools updated event (e.g., when a new pipeline is created)
  const handleChatToolsUpdated = useCallback((update: { type: string, id: string }) => {
    if (update.type === 'pipeline') {
      // Refresh the pipelines list
      mutate();
    }
  }, [mutate]);
  
  // Subscribe to tool events for this chat
  useToolEvents({
    chatId,
    onToolPipelineUpdated: handlePipelineUpdated,
    onChatToolsUpdated: handleChatToolsUpdated,
    // Only enable events after we've received initial data to prevent race conditions
    enabled: !!chatId && initialDataReceived.current,
  });
  
  const isLoading = !error && !pipelines;
  
  // Group pipelines by status for easier filtering in UI components
  const completedPipelines = pipelines?.filter((pipeline: ToolPipeline) => pipeline.status === ToolStatus.COMPLETED) || [];
  const failedPipelines = pipelines?.filter((pipeline: ToolPipeline) => pipeline.status === ToolStatus.FAILED) || [];
  const processingPipelines = pipelines?.filter((pipeline: ToolPipeline) => pipeline.status === ToolStatus.PROCESSING) || [];
  const pendingPipelines = pipelines?.filter((pipeline: ToolPipeline) => pipeline.status === ToolStatus.PENDING) || [];
  
  // Force refresh the pipelines
  const refreshPipelines = useCallback(() => {
    if (chatId) {
      mutate();
    }
  }, [chatId, mutate]);
  
  return {
    pipelines,
    completedPipelines,
    failedPipelines,
    processingPipelines,
    pendingPipelines,
    isLoading,
    error,
    refreshPipelines,
  };
}