"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"

type ErrorState = {
  hasError: boolean
  message: string
  code?: string
  retry?: () => void
}

export function useErrorHandler() {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    message: "",
  })

  const handleError = useCallback((error: Error) => {
    console.error("AI SDK Error:", error)

    let message = "An unexpected error occurred"
    let code = "unknown"

    // Handle different error types
    if (error.name === "AbortError") {
      message = "Request was aborted. Please try again."
      code = "abort"
    } else if (error.message.includes("rate limit")) {
      message = "Rate limit exceeded. Please wait a moment before trying again."
      code = "rate_limit"
    } else if (error.message.includes("context length")) {
      message = "The conversation is too long. Please start a new chat."
      code = "context_length"
    } else if (error.message.includes("authentication") || error.message.includes("auth")) {
      message = "Authentication error. Please sign in again."
      code = "auth"
    } else if (error.message.includes("network")) {
      message = "Network error. Please check your connection and try again."
      code = "network"
    } else if (
      (error.message.includes("invalid") && error.message.includes("key")) ||
      error.message.includes("API key") ||
      error.message.includes("unauthorized") ||
      (error as any).status === 401 ||
      (error as any).status === 403
    ) {
      message = "Invalid API key. Please check your API key and try again."
      code = "invalid_key"
    } else {
      message = `Error: ${error.message}`
    }

    toast.error(message)
    setErrorState({ hasError: true, message, code })

    // You could also report the error to an error tracking service here
    // reportErrorToService(error, code);
  }, [])

  const clearError = useCallback(() => {
    setErrorState({ hasError: false, message: "" })
  }, [])

  return {
    errorState,
    handleError,
    clearError,
  }
}

