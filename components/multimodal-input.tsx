'use client';

import type { Attachment, Message } from 'ai';
import cx from 'classnames';
import { TagInfo } from '@/lib/ai/dynamic-tag-parser';
import type React from 'react';
import { ToolCall, ToolStatus } from '@/lib/db/schema-tool-state';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { ArrowUpIcon, PaperclipIcon, StopIcon } from './icons';
import { FoldingIconDisplay } from './folding-icon-display';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { SuggestedActions } from './suggested-actions';
import { ToolApprovalInline } from './tool-approval-inline';
import { useToolApproval } from '@/hooks/use-tool-approval';
import equal from 'fast-deep-equal';
import { UseChatHelpers, UseChatOptions } from '@ai-sdk/react';

// Add CSS for tag field styling
const tagFieldStyles = `
  @keyframes tagFieldPulse {
    0% { background-color: rgba(255, 255, 0, 0.2); }
    50% { background-color: rgba(255, 255, 0, 0.4); }
    100% { background-color: rgba(255, 255, 0, 0.2); }
  }

  .tag-field-active {
    animation: tagFieldPulse 2s infinite;
    background-color: rgba(255, 255, 0, 0.3);
    border-radius: 4px;
    padding: 0 2px;
    cursor: text;
    position: relative;
  }
  
  .tag-field-active:hover::after {
    content: 'Click to edit';
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
  }
`;

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  /** Function to stop ongoing model generation */
  stop,
  /** Array of file attachments to include with the message */
  attachments = [],
  /** State setter for managing message attachments */
  setAttachments,
  messages,
  setMessages,
  append: originalAppend,
  handleSubmit,
  className,
  selectedModelId,
  onModelChange,
}: {
  chatId: string;
  input: UseChatHelpers['input'];
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<Message>;
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  className?: string;
  selectedModelId?: string;
  onModelChange?: (newModelString: string) => void;
}) {
  // Interface for tag fields in the input
  interface TagField {
    start: number;
    end: number;
    value: string;
    isAuto: boolean;
    originalTag: TagInfo;
    currentContent: string;
    isModified: boolean;
  }

  // Interface for tracking text changes
  interface ChangeInfo {
    type: 'insert' | 'delete' | 'replace';
    position: number;       // Where the change started
    length: number;         // Length of affected text
    newText?: string;       // For inserts and replaces
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  
  // Create a ref to store the submitForm function
  const submitFormRef = useRef<() => void>(() => {});
  
  // State to track tag fields in the input
  const [tagFields, setTagFields] = useState<TagField[]>([]);
  
  // Flag to track if we're currently interacting with tag fields
  const [isTagFieldMode, setIsTagFieldMode] = useState(false);
  // Track the currently active tag field for visual highlighting
  const [activeTagFieldIndex, setActiveTagFieldIndex] = useState<number | null>(null);
  
  // State for pending tool approvals
  const [pendingToolApprovals, setPendingToolApprovals] = useState<ToolCall[]>([]);
  
  // Use the tool approval hook
  const { approveToolExecution, rejectToolExecution } = useToolApproval();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  // Process input with tag fields
  const processTagFields = useCallback(async (text: string, tags: TagInfo[]) => {
    // Clear any existing tag fields
    setTagFields([]);
    setIsTagFieldMode(true);
    setActiveTagFieldIndex(null);
    
    try {
      console.log('[DEBUG] Processing tag fields:', tags.map(t => t.name).join(', '));
      
      // Get AI-generated replacements for ALL tags (both AI and non-AI)
      const replacements: Record<string, string> = {};
      
      // Use the AI registry to get actual replacements for tags
      try {
        // Process all tags at once using the server action
        try {
          // Import the server action dynamically
          const { generateTagReplacements } = await import('@/app/(chat)/actions');
          
          // Map tags to the format expected by the server action
          const simplifiedTags = tags.map(tag => ({
            name: tag.name,
            originalText: tag.originalText
          }));
          
          // Get replacements for all tags at once
          const allReplacements = await generateTagReplacements({
            tags: simplifiedTags,
            fullPrompt: text,
          });
          
          console.log('[DEBUG] AI responses for all tags:', allReplacements);
          
          // Use the replacements
          Object.assign(replacements, allReplacements);
        } catch (tagError) {
          console.error('[DEBUG] Exception getting replacements for tags:', tagError);
          
          // Fallback on exception - create default replacements for all tags
          for (const tag of tags) {
            replacements[tag.name] = tag.isAutoFill
              ? `AI-generated ${tag.name}`
              : `Suggested ${tag.name}`;
          }
        }
      } catch (aiError) {
        console.error('[DEBUG] Error using AI for tag replacements:', aiError);
        
        // Fallback to placeholder values if AI call fails
        tags.forEach(tag => {
          replacements[tag.name] = tag.isAutoFill
            ? `AI-generated ${tag.name}`
            : `Suggested ${tag.name}`;
        });
      }
      
      // Calculate tag positions in the text
      let currentPosition = 0;
      const newTagFields: TagField[] = [];
      
      // Create a modified text with replacements and visual indicators
      let modifiedText = text;
      let offset = 0;
      
      // Process each tag
      for (const tag of tags) {
        // Find the position of this tag in the original text
        const tagPosition = text.indexOf(tag.originalText, currentPosition);
        
        if (tagPosition !== -1) {
          // Calculate start and end positions in the original text
          const originalStart = tagPosition;
          const originalEnd = tagPosition + tag.originalText.length;
          
          // Get the replacement for this tag
          const replacement = replacements[tag.name] || `[${tag.name}]`;
          
          // For non-AI tags, we'll add visual indicators
          if (!tag.isAutoFill) {
            // Calculate positions in the modified text (accounting for added characters)
            const start = originalStart + offset;
            
            // Replace the tag with its suggestion
            modifiedText =
              modifiedText.substring(0, start) +
              replacement +
              modifiedText.substring(start + tag.originalText.length);
            
            // Update offset for the length difference
            offset += replacement.length - tag.originalText.length;
            
            // Calculate the new end position
            const end = start + replacement.length;
            
            // Add visual indicators around the tag
            const prefix = "「";  // Unicode left corner bracket
            const suffix = "」";  // Unicode right corner bracket
            
            // Insert the indicators
            modifiedText =
              modifiedText.substring(0, start) +
              prefix +
              modifiedText.substring(start, end) +
              suffix +
              modifiedText.substring(end);
            
            // Update offset for the added indicators
            offset += prefix.length + suffix.length;
            
            // Add to tag fields (positions in the modified text)
            newTagFields.push({
              start: start + prefix.length,
              end: start + prefix.length + replacement.length,
              value: replacement,
              isAuto: false,
              originalTag: tag,
              currentContent: replacement,
              isModified: false
            });
          } else {
            // For AI tags, just replace them directly without visual indicators
            const start = originalStart + offset;
            
            // Replace the tag with its AI-generated value
            modifiedText =
              modifiedText.substring(0, start) +
              replacement +
              modifiedText.substring(start + tag.originalText.length);
            
            // Update offset for the length difference
            offset += replacement.length - tag.originalText.length;
          }
          
          // Update current position for next search
          currentPosition = originalEnd;
        }
      }
      
      // Set the input with the modified text
      setInput(modifiedText);
      
      // Set the tag fields
      setTagFields(newTagFields);
      
      // If there are non-AI tag fields, focus the textarea and set the first one as active
      if (newTagFields.length > 0) {
        // Find the first non-AI tag field
        const firstNonAutoIndex = newTagFields.findIndex(field => !field.isAuto);
        
        if (firstNonAutoIndex !== -1) {
          setActiveTagFieldIndex(firstNonAutoIndex);
          setTimeout(() => {
            textareaRef.current?.focus();
            
            // Position cursor at the start of the first non-AI tag field
            if (textareaRef.current) {
              const field = newTagFields[firstNonAutoIndex];
              textareaRef.current.selectionStart = field.start;
              textareaRef.current.selectionEnd = field.end;
            }
          }, 0);
        }
      }
      
      // Adjust height for the new content
      setTimeout(adjustHeight, 0);
    } catch (error) {
      console.error('[DEBUG] Error processing tag fields:', error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error('[DEBUG] Error name:', error.name);
        console.error('[DEBUG] Error message:', error.message);
        console.error('[DEBUG] Error stack:', error.stack);
      }
      // Fallback to just setting the original text
      setInput(text);
    }
  }, [setInput]);

  // Detect what changed between two text strings
  const detectTextChanges = useCallback((oldText: string, newText: string): ChangeInfo => {
    // If lengths match exactly, it's a direct character replacement
    if (oldText.length === newText.length) {
      // Find the position where they differ
      for (let i = 0; i < oldText.length; i++) {
        if (oldText[i] !== newText[i]) {
          return {
            type: 'replace',
            position: i,
            length: 1,
            newText: newText[i]
          };
        }
      }
      return { type: 'replace', position: 0, length: 0 }; // No change
    }
    
    // If new text is longer, something was inserted
    if (newText.length > oldText.length) {
      // Find common prefix
      let prefixLength = 0;
      while (prefixLength < oldText.length &&
             oldText[prefixLength] === newText[prefixLength]) {
        prefixLength++;
      }
      
      // Find common suffix
      let suffixLength = 0;
      while (suffixLength < oldText.length - prefixLength &&
             oldText[oldText.length - 1 - suffixLength] ===
             newText[newText.length - 1 - suffixLength]) {
        suffixLength++;
      }
      
      const insertedText = newText.substring(
        prefixLength,
        newText.length - suffixLength
      );
      
      return {
        type: 'insert',
        position: prefixLength,
        length: insertedText.length,
        newText: insertedText
      };
    }
    
    // If new text is shorter, something was deleted
    if (newText.length < oldText.length) {
      // Similar logic to find deletion point and length
      let prefixLength = 0;
      while (prefixLength < newText.length &&
             oldText[prefixLength] === newText[prefixLength]) {
        prefixLength++;
      }
      
      let suffixLength = 0;
      while (suffixLength < newText.length - prefixLength &&
             oldText[oldText.length - 1 - suffixLength] ===
             newText[newText.length - 1 - suffixLength]) {
        suffixLength++;
      }
      
      return {
        type: 'delete',
        position: prefixLength,
        length: oldText.length - newText.length
      };
    }
    
    return { type: 'replace', position: 0, length: 0 }; // Fallback
  }, []);

  // Update tag positions based on detected changes
  const updateTagPositions = useCallback((changeInfo: ChangeInfo) => {
    setTagFields(currentFields => {
      return currentFields.map(field => {
        // Case 1: Change is before the tag - shift the entire tag
        if (changeInfo.position < field.start) {
          const offset = changeInfo.type === 'delete'
            ? -changeInfo.length
            : (changeInfo.newText?.length || 0);
            
          return {
            ...field,
            start: field.start + offset,
            end: field.end + offset
          };
        }
        
        // Case 2: Change is within the tag - adjust the tag content
        if (changeInfo.position >= field.start &&
            changeInfo.position < field.end) {
          
          let newEnd = field.end;
          if (changeInfo.type === 'delete') {
            newEnd -= Math.min(
              changeInfo.length,
              field.end - changeInfo.position
            );
          } else {
            newEnd += (changeInfo.newText?.length || 0);
          }
          
          // Update the current content of the tag
          const newContent = input.substring(field.start, newEnd);
          
          return {
            ...field,
            end: newEnd,
            currentContent: newContent,
            isModified: true
          };
        }
        
        // Case 3: Change is after the tag - no change needed
        return field;
      });
    });
  }, [input]);

  // Handle click within a tag field
  const handleTagFieldClick = useCallback((event: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!isTagFieldMode || tagFields.length === 0) return;
    
    // Get click position in text
    const textarea = event.currentTarget;
    const clickPosition = textarea.selectionStart;
    
    // Check if click is within a tag field
    const clickedFieldIndex = tagFields.findIndex(field =>
      clickPosition >= field.start && clickPosition <= field.end
    );
    
    if (clickedFieldIndex !== -1) {
      const clickedField = tagFields[clickedFieldIndex];
      
      // Set this as the active tag field
      setActiveTagFieldIndex(clickedFieldIndex);
      
      // Find the brackets around this field
      const prefixPos = clickedField.start - 1; // 「 is 1 character
      const suffixPos = clickedField.end; // Position of 」
      
      // Remove the tag field and its brackets
      const newInput =
        input.substring(0, prefixPos) +
        input.substring(suffixPos + 1); // +1 to remove the suffix bracket
      
      setInput(newInput);
      
      // Calculate the total characters removed
      const charsRemoved = (clickedField.end - clickedField.start) + 2; // +2 for the brackets
      
      // Update tag fields positions
      setTagFields(fields =>
        fields.filter((f, idx) => idx !== clickedFieldIndex)
              .map(f => {
                if (f.start > clickedField.start) {
                  return {
                    ...f,
                    start: f.start - charsRemoved,
                    end: f.end - charsRemoved
                  };
                }
                return f;
              })
      );
      
      // Position cursor at the start of where the tag was
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = prefixPos;
          textareaRef.current.selectionEnd = prefixPos;
          textareaRef.current.focus();
        }
      }, 0);
      
      event.preventDefault();
    } else {
      // If clicked outside any tag field, clear the active field
      setActiveTagFieldIndex(null);
    }
  }, [input, isTagFieldMode, tagFields, setInput]);

  // Update which tag is active based on cursor position
  const updateActiveTag = useCallback((cursorPosition: number) => {
    // Find which tag contains the cursor
    const activeIndex = tagFields.findIndex(
      field => cursorPosition >= field.start && cursorPosition <= field.end
    );
    
    setActiveTagFieldIndex(activeIndex !== -1 ? activeIndex : null);
  }, [tagFields]);

  // Handle selection changes
  const handleSelectionChange = useCallback(() => {
    if (!textareaRef.current || !isTagFieldMode) return;
    
    const selectionStart = textareaRef.current.selectionStart;
    
    // Update the active tag based on cursor position
    updateActiveTag(selectionStart);
  }, [isTagFieldMode, updateActiveTag]);

  // Enhanced input handler with sophisticated change tracking
  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    const oldValue = input;
    
    // If input is cleared, also clear tag fields
    if (newValue === '' && oldValue !== '' && isTagFieldMode) {
      setIsTagFieldMode(false);
      setTagFields([]);
      setActiveTagFieldIndex(null);
    }
    // If we're in tag field mode, track changes precisely
    else if (isTagFieldMode && tagFields.length > 0) {
      // Detect what changed between oldValue and newValue
      const changeInfo = detectTextChanges(oldValue, newValue);
      
      // If there was a significant change
      if (changeInfo.length > 0) {
        // Update tag positions based on the change
        updateTagPositions(changeInfo);
        
        // Update the active tag based on current cursor position
        if (textareaRef.current) {
          updateActiveTag(textareaRef.current.selectionStart);
        }
      }
    }
    
    // Update the input value
    setInput(newValue);
    adjustHeight();
  };
  
  // Create a wrapped version of append that handles tag information and tool approvals
  const append = useCallback((message: any, options?: any) => {
    // Clear any previous tag fields when a new message is appended
    if (isTagFieldMode) {
      setIsTagFieldMode(false);
      setTagFields([]);
      setActiveTagFieldIndex(null);
    }
    
    // Check if the message has tag information
    if (message && message.tags && Array.isArray(message.tags)) {
      console.log('Message contains tags:', message.tags);
      
      // Process the tag fields
      processTagFields(message.content, message.tags);
      
      // Check if this message needs user input before proceeding
      const needsUserInput = message.needsUserInput === true;
      
      // Check if this is a system action that can be auto-executed
      const isSystemAction = message.systemAction === true;
      
      console.log(`Message properties: needsUserInput=${needsUserInput}, systemAction=${isSystemAction}`);
      
      if (needsUserInput) {
        console.log('Waiting for user input before proceeding');
        // Update the input state and wait for user to edit and submit
      } else if (isSystemAction) {
        console.log('Auto-executing system action');
        // For system actions that don't need user input, we could auto-execute
        // But for now, we'll still let the user review and submit manually
        // This prevents creating a new chat while maintaining user control
      }
      
      // Don't actually append the message yet - wait for user input/confirmation
      return Promise.resolve(null);
    }
    
    // Check if the message has a tool call that requires approval
    if (message && message.toolCall && message.toolCall.status === ToolStatus.AWAITING_APPROVAL) {
      console.log('Message contains a tool call that requires approval:', message.toolCall);
      
      // Add the tool call to the pending approvals
      setPendingToolApprovals(prev => [...prev, message.toolCall]);
      
      // Don't actually append the message yet - wait for user approval
      return Promise.resolve(null);
    }
    
    // Otherwise, use the original append function
    return originalAppend(message, options);
  }, [originalAppend, processTagFields, isTagFieldMode]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const submitForm = useCallback(() => {
    window.history.replaceState({}, '', `/chat/${chatId}`);
    
    console.log(`Submitting form with ${attachments.length} attachments`);

    // Log the submission details
    console.log(`Chat submission details:
      - chatId: ${chatId}
      - input length: ${input.length}
      - attachments count: ${attachments.length}`);

    handleSubmit(undefined, {
      experimental_attachments: attachments,
      // Note: desiredOutput is handled in the body parameter of useChat in chat.tsx
    });

    // Clear all state after submission
    setAttachments([]);
    setLocalStorageInput('');
    resetHeight();
    
    // Clear tag fields state
    setIsTagFieldMode(false);
    setTagFields([]);
    setActiveTagFieldIndex(null);
    
    // Clear pending tool approvals
    setPendingToolApprovals([]);

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    attachments,
    handleSubmit,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
    input.length,
  ]);

  // Update the submitFormRef whenever submitForm changes
  useEffect(() => {
    submitFormRef.current = submitForm;
  }, [submitForm]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (error) {
      toast.error('Failed to upload file, please try again!');
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error('Error uploading files!', error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments],
  );

  // Handle tool approval
  const handleToolApprove = async (toolCallId: string) => {
    try {
      await approveToolExecution(toolCallId);
      
      // Remove the tool call from pending approvals
      setPendingToolApprovals(prev => prev.filter(tc => tc.id !== toolCallId));
      
      // Clear the input to remove the approval UI
      setInput('');
    } catch (error) {
      console.error('Error approving tool:', error);
    }
  };
  
  // Handle tool rejection
  const handleToolReject = async (toolCallId: string) => {
    try {
      await rejectToolExecution(toolCallId);
      
      // Remove the tool call from pending approvals
      setPendingToolApprovals(prev => prev.filter(tc => tc.id !== toolCallId));
      
      // Clear the input to remove the approval UI
      setInput('');
    } catch (error) {
      console.error('Error rejecting tool:', error);
    }
  };
  
  // Handle completion of tool approval process
  const handleToolApprovalComplete = () => {
    // Clear pending tool approvals
    setPendingToolApprovals([]);
  };
  
  return (
    <div className="relative w-full flex flex-col gap-4">
      {/* Add the tag field styles */}
      <style>{tagFieldStyles}</style>
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 &&
        pendingToolApprovals.length === 0 && (
          <SuggestedActions append={append} chatId={chatId} />
        )}

      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div
          data-testid="attachments-preview"
          className="flex flex-row gap-2 overflow-x-scroll items-end"
        >
          {attachments.map((attachment) => (
            <PreviewAttachment key={attachment.url} attachment={attachment} />
          ))}

          {uploadQueue.map((filename) => (
            <PreviewAttachment
              key={filename}
              attachment={{
                url: '',
                name: filename,
                contentType: '',
              }}
              isUploading={true}
            />
          ))}
        </div>
      )}
      
      {/* Display pending tool approvals */}
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

      <Textarea
        data-testid="multimodal-input"
        ref={textareaRef}
        placeholder="Ask me to do anything..."
        value={input}
        onChange={handleInput}
        className={cx(
          'min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-2xl !text-base bg-muted pb-10 dark:border-zinc-700',
          className,
        )}
        rows={2}
        autoFocus
        onClick={handleTagFieldClick}
        style={{
          // Add custom styles for tag field highlighting
          // This will be processed by the browser as inline CSS
          '--tag-highlight-color': 'rgba(255, 255, 0, 0.2)', // Yellow highlight
          '--tag-active-color': 'rgba(255, 255, 0, 0.4)', // Darker yellow for active tag
        } as React.CSSProperties}
        onKeyDown={(event) => {
          // Track selection changes on key navigation
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
            // Use setTimeout to ensure we get the updated selection after the key event
            setTimeout(handleSelectionChange, 0);
          }
          // Handle Tab key for navigating between tag fields
          if (event.key === 'Tab' && isTagFieldMode && tagFields.length > 1) {
            // Find the current cursor position
            const cursorPosition = textareaRef.current?.selectionStart || 0;
            
            // Find the current tag field (if any)
            const currentFieldIndex = tagFields.findIndex(field =>
              cursorPosition >= field.start && cursorPosition <= field.end
            );
            
            // Determine direction (forward or backward)
            const direction = event.shiftKey ? -1 : 1;
            
            // If we're in a tag field or can find one to navigate to
            if (currentFieldIndex !== -1 || tagFields.length > 0) {
              // Calculate the next field index with proper wrapping
              let nextFieldIndex;
              if (currentFieldIndex === -1) {
                // If not in a field, go to first or last depending on direction
                nextFieldIndex = direction > 0 ? 0 : tagFields.length - 1;
              } else {
                // Move in the specified direction with wrapping
                nextFieldIndex = (currentFieldIndex + direction + tagFields.length) % tagFields.length;
              }
              
              const nextField = tagFields[nextFieldIndex];
              
              // Update the active tag field
              setActiveTagFieldIndex(nextFieldIndex);
              
              // Position cursor at the start of the next tag
              setTimeout(() => {
                if (textareaRef.current) {
                  // Position cursor at start of field for forward navigation,
                  // or end of field for backward navigation
                  const cursorPos = direction > 0 ? nextField.start : nextField.end;
                  textareaRef.current.selectionStart = cursorPos;
                  textareaRef.current.selectionEnd = cursorPos;
                  textareaRef.current.focus();
                }
              }, 0);
              
              event.preventDefault();
            }
  
            // Handle selection tracking for special keys
            if (['Backspace', 'Delete'].includes(event.key)) {
              // After deletion, update the active tag
              setTimeout(handleSelectionChange, 0);
            }
          }
          
          // Handle Enter key for submission
          if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            console.log(`Enter key pressed for submission`);

            if (status !== 'ready') {
              console.log(`Cannot submit - status is ${status}`);
              toast.error('Please wait for the model to finish its response!');
            } else {
              console.log(`Status is ready, submitting form`);
              
              // If we're in tag field mode, process any remaining tags
              if (isTagFieldMode && tagFields.length > 0) {
                console.log(`Submitting with tag fields: ${tagFields.length}`);
                // In a real implementation, you'd process the tags here
                // For now, we'll just submit as-is
              }
              
              submitForm();
              
              // Reset tag field mode
              setIsTagFieldMode(false);
              setTagFields([]);
              setActiveTagFieldIndex(null);
            }
          }
        }}
      />

      <div className="absolute bottom-0 p-2 w-fit flex flex-row justify-start">
        <AttachmentsButton fileInputRef={fileInputRef} status={status} />
      </div>
      
      {/* Model display controls - centered, offset for paperclip */}
      <div className="absolute bottom-0 p-2 flex flex-row justify-center items-center gap-2 max-xs:left-10" style={{left: '38px', right: '38px'}}>
        <FoldingIconDisplay
          selectedModelId={selectedModelId || ''}
          className="max-xs:ml-2"
          onModelChange={onModelChange}
        />
      </div>

      <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end">
        {status === 'submitted' ? (
          <StopButton stop={stop} setMessages={setMessages} />
        ) : (
          <SendButton
            input={input}
            submitForm={submitForm}
            uploadQueue={uploadQueue}
          />
        )}
      </div>
    </div>
  );
}

function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers['status'];
}) {
  return (
    <Button
      data-testid="attachments-button"
      className="rounded-md rounded-bl-lg p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200"
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={status !== 'ready'}
      variant="ghost"
    >
      <PaperclipIcon size={14} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers['setMessages'];
}) {
  return (
    <Button
      data-testid="stop-button"
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        stop();
        // Use type assertion to work around version mismatch
        (setMessages as any)((messages: any) => messages);
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  return (
    <Button
      data-testid="send-button"
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={input.length === 0 || uploadQueue.length > 0}
    >
      <ArrowUpIcon size={14} />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;
    if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;
    return true;
  },
);
