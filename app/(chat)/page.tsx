import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { auth } from '@/app/(auth)/auth';
import { ErrorBoundary } from '@/components/error-boundary';
import { RefreshButton } from '@/components/refresh-button';

// Define the type for the page props
export default async function Page({
  params,
  searchParams,
}: {
  params: any;
  searchParams: any;
}) {
  const id = generateUUID();

  // Get the current user session
  const session = await auth();
  
  // IMPORTANT: First await the searchParams object before accessing any properties
  // This prevents the "searchParams should be awaited" error
  const resolvedSearchParams = await searchParams;
  
  // Now we can safely access its properties
  const promptParam = resolvedSearchParams?.prompt;
  const prompt = typeof promptParam === 'string' ? promptParam : undefined;
  
  // Only create a placeholder chat if there's a prompt parameter in the URL
  // This ensures we only create chats when a user clicks on a prompt suggestion
  const hasPrompt = prompt && typeof prompt === 'string';
  
  // Get cookies for model selection
  const cookieStore = await cookies();
  
  // Get the model from cookie
  const modelCookieValue = cookieStore.get('chat-model');
  
  // Default to 'quick' alias which will be resolved by the registry
  let selectedModel = 'quick';
  
  if (modelCookieValue) {
    // The cookie stores the model in provider:model format or as an alias
    selectedModel = modelCookieValue.value;
    
    // Check if the cookie value is valid
    if (!selectedModel || selectedModel.trim() === '') {
      selectedModel = 'quick';
    }
  }
  
  // Skip placeholder chat creation entirely
  // We'll create the chat when the user actually sends a message
  // This prevents race conditions between model selection and chat creation
  return (
    <>
      <ErrorBoundary
        fallback={
          <div className="p-4 text-center">
            <h2 className="text-xl font-bold">Something went wrong</h2>
            <p className="text-gray-600 mt-2">
              We encountered an error while saving your message.
            </p>
            <p className="text-gray-600">
              Please try again or refresh the page.
            </p>
            <RefreshButton />
          </div>
        }
      >
        <Chat
          key={id}
          id={id}
          initialMessages={[]}
          selectedChatModel={selectedModel}
          selectedVisibilityType="private"
          isReadonly={false}
        />
      </ErrorBoundary>
      <DataStreamHandler id={id} />
    </>
  );
}
