import { toast } from "sonner"

// Error codes mapping to user-friendly messages
export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  unauthorized: "You need to be signed in to access this resource",
  unauthorized_chat_access: "You do not have permission to access this chat",

  // Input validation errors
  invalid_message: "No valid message was provided",
  missing_chat_id: "Chat ID is required",

  // Resource errors
  chat_not_found: "The requested chat could not be found",
  missing_assistant_message: "Failed to generate assistant response",

  // AI SDK errors
  api_key_load_error: "API key could not be loaded. Please check your configuration",
  invalid_argument: "Invalid argument provided to AI model",

  // Rate limiting
  rate_limit: "Rate limit exceeded. Please try again in a moment",

  // Model errors
  context_length: "This conversation is too long. Please start a new chat",
  invalid_key: "Invalid API key. Please check your configuration",

  // Network errors
  network: "Network error. Please check your connection and try again",

  // Default
  internal_server_error: "An unexpected error occurred. Please try again",
  unknown_error: "Something went wrong. Please try again",
}

// Function to handle API response errors
export async function handleApiResponse(response: Response) {
  if (!response.ok) {
    let errorData
    try {
      errorData = await response.json()
    } catch (e) {
      throw new Error(`${response.status}: ${response.statusText}`)
    }

    const errorCode = errorData.code || "unknown_error"
    const errorMessage = ERROR_MESSAGES[errorCode] || errorData.error || "An unknown error occurred"

    // Show toast notification
    toast.error(errorMessage)

    // Throw error with details
    const error = new Error(errorMessage)
    ;(error as any).code = errorCode
    ;(error as any).status = response.status
    throw error
  }

  return response
}

