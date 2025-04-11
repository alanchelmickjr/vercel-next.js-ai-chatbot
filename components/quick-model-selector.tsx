'use client';

/**
 * This component provides a convenient set of buttons
 * ("Quick", "Complete", and "Creative") for switching
 * between different model categories quickly. It uses
 * the user's saved preferences when available, and it
 * can also update or cache the selected model in a cookie.
 */

import { useCallback, useMemo, useOptimistic, useState, useRef, useTransition, memo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { setClientCookie } from '@/lib/client-cookie';
import { usePreferences } from '@/hooks/use-preferences';
import { useRegistry } from '@/hooks/use-registry';

/**
 * Props for QuickModelSelector
 * @property {string} selectedModelId - The current selected model's ID
 * @property {string} [className] - An optional CSS class for styling
 * @property {(newModelString: string) => void} [onModelChange] - Optional callback when the model changes
 */
// Pure component implementation
function PureQuickModelSelector({
  selectedModelId,
  className,
  onModelChange,
}: {
  selectedModelId: string;
  className?: string;
  onModelChange?: (newModelString: string) => void;
}) {
  // useOptimistic helps manage "optimistic" updates to the model ID
  // so the UI reflects changes immediately.
  const [optimisticModelId, setOptimisticModelId] = useOptimistic(selectedModelId);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Access user's preferred model settings
  const { setPreferredModel } = usePreferences();

  // Use the registry hook
  const { getModel } = useRegistry();

  /**
   * The activeType indicates the general category of the current model,
   * such as 'text', or any type defined in the model's category metadata.
   */
  // Simplified active type determination
  const activeType = 'text'; // Default to text for all models

  /**
   * The currentCategory is determined by the presence of keywords
   * in the category name: '-quick', '-complete', or '-creative'.
   * This is used to highlight the active button style for that category.
   */
  // Determine the current category based on the model ID
  const currentCategory = useMemo(() => {
    // Default to 'quick' when there's no clear selection
    if (!selectedModelId) return 'quick';
    
    // Check if the model ID contains category indicators
    if (selectedModelId.includes('quick')) return 'quick';
    if (selectedModelId.includes('complete')) return 'complete';
    if (selectedModelId.includes('creative')) return 'creative';
    
    // For provider:model format, infer from the provider and model
    const modelParts = selectedModelId.split(':');
    if (modelParts.length === 2) {
      const provider = modelParts[0];
      const model = modelParts[1];
      
      // Simplified logic based on provider and model
      if (provider === 'anthropic') return 'creative';
      if (model.includes('gpt-4o')) return 'complete';
    }
    
    // Default to 'quick' if we couldn't determine the category
    return 'quick';
  }, [selectedModelId]);

  /**
   * handleCategorySelect uses the category name directly as an alias
   * that the registry will resolve to the appropriate provider:model format.
   * This avoids hardcoding model IDs and ensures consistent model format.
   */
  // Track pending state for UI feedback
  const [isPending, startTransition] = useTransition();
  const [selectId, setSelectId] = useState<string | null>(null);
  const handleCategorySelect = useCallback((categoryName: string) => {
    // Only proceed if the selected category is different from the current one
    if (categoryName === currentCategory) {
      return; // No change needed
    }
    
    // Generate a unique ID for this selection
    const selectionId = Math.random().toString(36).substring(2, 8);
    setSelectId(selectionId);
    
    // Use the category name directly as the model alias
    // The registry will resolve this to the appropriate provider:model format
    const modelIdToUse = categoryName;
    
    // Update UI and preferences
    startTransition(() => {
      // Immediately reflect the new model in the UI
      setOptimisticModelId(modelIdToUse);
      
      // Update the user's preference
      setPreferredModel(categoryName, modelIdToUse);
    });
    
    // Only set the cookie if the model is actually changing
    // This prevents unnecessary cookie updates that trigger refreshes
    if (modelIdToUse !== selectedModelId) {
      setClientCookie('chat-model', modelIdToUse, 30);
    }
    
    // If an external callback is provided, use it
    if (onModelChange) {
      onModelChange(modelIdToUse);
    }
    // No need to reload the page - the model change will be applied on the next message
  }, [setOptimisticModelId, setPreferredModel, onModelChange, startTransition, currentCategory, selectedModelId]);

  /**
   * Render three buttons for each main category type we support:
   * "Quick", "Complete", and "Creative". Each button updates
   * the model selection to match that category.
   */
  const [isOpen, setIsOpen] = useState(false);
  
  // Get active category name for display
  const activeCategoryName = useMemo(() => {
    if (currentCategory === 'quick') return 'Quick';
    if (currentCategory === 'complete') return 'Complete';
    if (currentCategory === 'creative') return 'Creative';
    return 'Select Model';
  }, [currentCategory]);
  
  // Handle selection in dropdown mode
  const handleSelect = useCallback((category: string) => {
    handleCategorySelect(category);
    setIsOpen(false);
  }, [handleCategorySelect]);

  // We always render the component now since we don't depend on categories or models
  
  return (
    <div className={cn("relative", className)}>
      {/* Large screen horizontal layout */}
      <div className="hidden xs:flex items-center space-x-1">
        <Button
          variant={currentCategory === 'quick' ? "default" : "outline"}
          size="sm"
          onClick={() => handleCategorySelect('quick')}
          className="text-xs px-2 py-1 h-7"
        >
          Quick
        </Button>
        <Button
          variant={currentCategory === 'complete' ? "default" : "outline"}
          size="sm"
          onClick={() => handleCategorySelect('complete')}
          className="text-xs px-2 py-1 h-7"
        >
          Complete
        </Button>
        <Button
          variant={currentCategory === 'creative' ? "default" : "outline"}
          size="sm"
          onClick={() => handleCategorySelect('creative')}
          className="text-xs px-2 py-1 h-7"
        >
          Creative
        </Button>
      </div>
      
      {/* Small screen dropdown */}
      <div
        className="xs:hidden relative inline-block"
        onMouseEnter={() => {
          // Clear any pending close timer
          if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
          }
          setIsOpen(true);
        }}
        onMouseLeave={() => {
          // Set a small delay before closing to allow movement between button and dropdown
          closeTimerRef.current = setTimeout(() => setIsOpen(false), 50);
        }}
        onClick={(e) => {
          if ('ontouchstart' in window) {
            // For touch devices
            if ((e.target as HTMLElement).closest('button')?.classList.contains('dropdown-item')) {
              return;
            }
            setIsOpen(!isOpen);
          }
        }}
      >
        <Button
          variant="outline"
          size="sm"
          className="text-xs px-2 py-1 h-7 w-28 flex justify-between items-center"
        >
          <span>{activeCategoryName}</span>
          <span className={`ml-1 transition-opacity duration-200 ${isOpen ? 'opacity-0' : 'opacity-100'}`}>▼</span>
        </Button>
        
        <div
          className={`absolute top-full left-0 z-10 mt-1 bg-background border rounded-md shadow-md overflow-hidden transition-all duration-300 ease-in-out origin-top`}
          style={{
            maxHeight: isOpen ? '200px' : '0',
            opacity: isOpen ? 1 : 0,
            width: '100%',
            pointerEvents: isOpen ? 'auto' : 'none',
            transform: `scaleY(${isOpen ? 1 : 0})`,
          }}
        >
          <div
            className="p-1 grid gap-1"
            style={{
              gridTemplateRows: 'repeat(auto-fit, minmax(1.75rem, auto))',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: isOpen ? 'translateY(0)' : 'translateY(-10px)',
            }}
          >
            {currentCategory !== 'quick' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelect('quick')}
                className={`text-xs px-2 py-1 h-7 w-full text-left justify-start dropdown-item ${isOpen ? 'grow-in-delay-1' : ''}`}
              >
                Quick
              </Button>
            )}
            {currentCategory !== 'complete' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelect('complete')}
                className={`text-xs px-2 py-1 h-7 w-full text-left justify-start dropdown-item ${isOpen ? 'grow-in-delay-2' : ''}`}
              >
                Complete
              </Button>
            )}
            {currentCategory !== 'creative' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelect('creative')}
                className={`text-xs px-2 py-1 h-7 w-full text-left justify-start dropdown-item ${isOpen ? 'grow-in-delay-3' : ''}`}
              >
                Creative
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Memoized version of the QuickModelSelector component
 * Only re-renders when props change (selectedModelId, className, or onModelChange)
 */
export const QuickModelSelector = memo(PureQuickModelSelector);