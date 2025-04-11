"use client"

import type { Attachment, UIMessage } from "ai"
import { useChat } from "@ai-sdk/react"
import { useState, useEffect, startTransition, useRef, useTransition } from "react"
import useSWR, { useSWRConfig } from "swr"
import { ChatHeader } from "@/components/chat-header"
import { ChatToolPipelines } from "@/components/chat-tool-pipelines"
import type { Vote } from "@/lib/db/schema"
import { fetcher, generateUUID } from "@/lib/utils"
import { Artifact } from "./artifact"
import { MultimodalInput } from "./multimodal-input"
import { Messages } from "./messages"
import type { VisibilityType } from "./visibility-selector"
import { useArtifactSelector } from "@/hooks/use-artifact"
import { useErrorHandler } from "@/hooks/use-error-handler"
import { ErrorBanner } from "@/components/error-banner"
import { saveChatModelAsCookie } from "@/app/(chat)/actions"
import { setClientCookie } from "@/lib/client-cookie"


export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string
  initialMessages: Array<UIMessage>
  selectedChatModel: string
  selectedVisibilityType: VisibilityType
  isReadonly: boolean
}) {
  const { mutate } = useSWRConfig()
  const { errorState, handleError, clearError } = useErrorHandler()
  
  // Generate a unique ID for this chat component instance
  const chatComponentId = useRef(Math.random().toString(36).substring(2, 8)).current;
  
  
  // Convert selectedChatModel prop to internal state
  const [currentModel, setCurrentModel] = useState(selectedChatModel)
  
  // Log when the component receives a new selectedChatModel prop
  useEffect(() => {
    // Always update the current model when the prop changes
    setCurrentModel(selectedChatModel);
    
    // Also check if there's a cookie value that might be more recent
    const cookieModel = document.cookie
      .split('; ')
      .find(row => row.startsWith('chat-model='))
      ?.split('=')[1];
    
    if (cookieModel && cookieModel !== selectedChatModel) {
      setCurrentModel(cookieModel);
    }
  }, [selectedChatModel, chatComponentId]);
  
  // Track pending state for UI feedback
  const [isPending, startTransition] = useTransition();
  
  // Simple function to update model without resetting chat
  const updateModelString = (newModelString: string) => {
    const updateId = Math.random().toString(36).substring(2, 8);

    // Try to ensure we're using provider:model format
    let modelToUse = newModelString;
    
    // If the model ID doesn't include a colon, try to convert it to provider:model format
    if (!modelToUse.includes(':')) {
      // For UUIDs, use a default provider based on a pattern or just use 'anthropic' as default
      if (modelToUse.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // This is a UUID, convert it to provider:model format with a default provider
        modelToUse = `anthropic:${modelToUse}`;
      }
    }
    
    // Skip update if it's the same model
    if (currentModel === modelToUse) {
      return;
    }
    
    // Use startTransition for optimistic UI updates
    startTransition(() => {
      // Update local state for immediate UI response
      setCurrentModel(modelToUse);
    });
    
    // Set the cookie in the background without causing a page refresh
    setClientCookie('chat-model', modelToUse, 30);
    
    // No need to reload the page - the model change will be applied on the next message
  }
  
  const { messages, setMessages, handleSubmit, input, setInput, append, status, stop, reload } = useChat({
    id,
    body: {
      id,
      selectedChatModel: currentModel, // Use the internal state instead of prop
      desiredOutput: 'text' // Explicitly set desiredOutput to 'text'
    },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      mutate("/api/history")
    },
    onError: (error) => {
      handleError(error);
    },
  })
  
  // No need to log every message update

  const { data: votes } = useSWR<Array<Vote>>(messages.length >= 2 ? `/api/vote?chatId=${id}` : null, fetcher)

  const [attachments, setAttachments] = useState<Array<Attachment>>([])
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible)

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={currentModel}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
          onModelChange={updateModelString}
        />

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages as any}
          setMessages={setMessages as any}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        {/* Display active tool pipelines */}
        <ChatToolPipelines chatId={id} />

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages as any}
              setMessages={setMessages as any}
              append={append as any}
              selectedModelId={currentModel}
              onModelChange={updateModelString}
            />
          )}
        </form>
      </div>
      {errorState.hasError && (
        <ErrorBanner
          message={errorState.message}
          onDismiss={clearError}
          onRetry={() => {
            clearError()
            reload()
          }}
        />
      )}

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages as any}
        setMessages={setMessages as any}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
        selectedModelId={currentModel}
        onModelChange={updateModelString}
      />
    </>
  )
}
