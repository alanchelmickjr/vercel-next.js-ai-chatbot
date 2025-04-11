import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';
import { Chat } from '@/components/chat';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DBMessage } from '@/lib/db/schema';
import { Attachment, UIMessage } from 'ai';
import Script from 'next/script';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  if (chat.visibility === 'private') {
    if (!session || !session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  // Get messages for this chat
  const messagesFromDb = await getMessagesByChatId({
    id,
  });
  
  // Log whether messages were found
  console.log(`[${new Date().toISOString()}] Chat ${id}: Found ${messagesFromDb.length} messages`);

  function convertToUIMessages(messages: Array<DBMessage>): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage['parts'],
      role: message.role as UIMessage['role'],
      // Note: content will soon be deprecated in @ai-sdk/react
      content: '',
      createdAt: message.createdAt,
      experimental_attachments:
        (message.attachments as Array<Attachment>) ?? [],
    }));
  }

  // Get model selection from cookie
  const cookieStore = await cookies();
  const modelCookieValue = cookieStore.get('chat-model');
  
  // Default to 'quick' alias which will be resolved by the registry
  let selectedModel = 'quick';
  
  // Use the cookie value if present
  if (modelCookieValue) {
    // The cookie stores the model directly in provider:modelTagOrId format or as an alias
    selectedModel = modelCookieValue.value;
    
    // Check if the cookie value is valid
    if (!selectedModel || selectedModel.trim() === '') {
      selectedModel = 'quick';
    }
  }
return (
  <>
    {/* Add a script to check for client-side cookies and update the page if needed */}
    <Script id="check-client-cookies" strategy="afterInteractive">
      {`
        (function() {
          try {
            // Function to get cookie value
            function getCookie(name) {
              const nameEQ = name + "=";
              const ca = document.cookie.split(';');
              for(let i=0; i < ca.length; i++) {
                let c = ca[i];
                while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
              }
              return null;
            }
            
            // Check if there's a client-side cookie that differs from the server-side one
            const clientCookie = getCookie('chat-model');
            const serverModel = "${selectedModel}";
            // If client cookie exists and differs from server, reload the page to use the client cookie
            if (clientCookie && clientCookie !== serverModel) {
              window.location.reload();
            }
          } catch (error) {
            // Silent fail for cookie checking
          }
        })();
      `}
    </Script>
    <Chat
      id={chat.id}
      initialMessages={convertToUIMessages(messagesFromDb)}
      selectedChatModel={selectedModel}
      selectedVisibilityType={chat.visibility}
      isReadonly={session?.user?.id !== chat.userId}
    />
    <DataStreamHandler id={id} />
  </>
);
}
