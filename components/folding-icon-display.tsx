'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { IconCategoryDisplay } from './icon-category-display';
import { IconProviderDisplay } from './icon-provider-display';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { BotIcon, CheckCircleFillIcon, LightningIcon } from './icons';

// Main providers that we want to show in the dropdown
const MAIN_PROVIDERS = [
  'openai',
  'anthropic',
  'mistral',
  'googleai'
];

export function FoldingIconDisplay({
  selectedModelId,
  className,
  onModelChange
}: {
  selectedModelId: string;
  className?: string;
  onModelChange?: (newModelString: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentProvider, setCurrentProvider] = useState<string>('');
  const [currentCategory, setCurrentCategory] = useState<string>('quick');

  // Extract current provider and category from selectedModelId
  useEffect(() => {
    // Extract provider
    if (selectedModelId && selectedModelId.includes(':')) {
      const [provider] = selectedModelId.split(':');
      setCurrentProvider(provider.toLowerCase());
    } else if (selectedModelId) {
      // Default fallbacks based on model name patterns
      if (selectedModelId.toLowerCase().includes('gpt') || 
          selectedModelId.toLowerCase().includes('dall-e')) {
        setCurrentProvider('openai');
      } else if (selectedModelId.toLowerCase().includes('claude')) {
        setCurrentProvider('anthropic');
      } else if (selectedModelId.toLowerCase().includes('gemini') || 
                selectedModelId.toLowerCase().includes('palm')) {
        setCurrentProvider('googleai');
      } else {
        setCurrentProvider('openai'); // Default
      }
    }

    // Extract category
    if (selectedModelId.includes('quick')) {
      setCurrentCategory('quick');
    } else if (selectedModelId.includes('complete')) {
      setCurrentCategory('complete');
    } else if (selectedModelId.includes('creative')) {
      setCurrentCategory('creative');
    } else {
      setCurrentCategory('quick'); // Default
    }
  }, [selectedModelId]);

  // Handle model category selection
  const handleCategorySelect = (category: string) => {
    // Update local state first for immediate UI feedback
    setCurrentCategory(category);
    setIsExpanded(false); // Close the popup immediately
    
    // Use the category name directly as the model alias
    // The registry will resolve this to the appropriate provider:model format
    if (onModelChange) {
      // Small delay to ensure UI updates first
      setTimeout(() => {
        onModelChange(category);
      }, 10);
    }
  };

  // Handle provider selection
  const handleProviderSelect = (provider: string) => {
    if (onModelChange) {
      // Use the current category with the new provider
      // The registry will resolve this to the appropriate model
      const newModelId = `${provider}:${currentCategory}`;
      onModelChange(newModelId);
    }
    setIsProviderDropdownOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Category icons with folding behavior on mobile */}
      <div
        className="relative"
        onMouseEnter={() => {
          // Clear any pending close timer
          if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
          }
          setIsExpanded(true);
        }}
        onMouseLeave={() => {
          // Set a small delay before closing to allow movement between elements
          closeTimerRef.current = setTimeout(() => setIsExpanded(false), 50);
        }}
        onClick={() => {
          if ('ontouchstart' in window) {
            // For touch devices, toggle on click
            setIsExpanded(!isExpanded);
          }
          if (onModelChange) {
            handleCategorySelect('quick');
          }
        }}
      >
        {/* Show only the current category icon */}
        <div className="flex items-center z-10 relative cursor-pointer">
          {currentCategory === 'quick' && (
            <div
              className="p-1 size-7 rounded-full bg-foreground text-background flex items-center justify-center"
              title="Quick"
            >
              <LightningIcon size={14} />
            </div>
          )}
          {currentCategory === 'complete' && (
            <div
              className="p-1 size-7 rounded-full bg-foreground text-background flex items-center justify-center"
              title="Complete"
            >
              <CheckCircleFillIcon size={14} />
            </div>
          )}
          {currentCategory === 'creative' && (
            <div
              className="p-1 size-7 rounded-full bg-foreground text-background flex items-center justify-center"
              title="Creative"
            >
              <BotIcon size={14} />
            </div>
          )}
        </div>
        
        {/* Animated dropdown for categories using icons instead of text */}
        <div
          className="absolute bottom-full left-0 z-10 mb-1 bg-background border rounded-md shadow-md overflow-hidden transition-all duration-300 ease-in-out origin-bottom"
          style={{
            maxHeight: isExpanded ? '200px' : '0',
            opacity: isExpanded ? 1 : 0,
            width: 'auto',
            pointerEvents: isExpanded ? 'auto' : 'none',
            transform: `scaleY(${isExpanded ? 1 : 0})`,
            transformOrigin: 'bottom',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            bottom: '100%',
            top: 'auto'
          }}
          role="menu"
        >
          <div className="p-1 flex flex-col gap-1">
            {currentCategory !== 'quick' && (
              <Button
                variant="ghost"
                className="p-1 flex items-center justify-center hover:bg-muted rounded-md"
                title="Quick"
                onClick={() => handleCategorySelect('quick')}
              >
                <div className="p-1 size-7 rounded-full border border-input flex items-center justify-center">
                  <LightningIcon size={14} />
                </div>
              </Button>
            )}
            {currentCategory !== 'complete' && (
              <Button
                variant="ghost"
                className="p-1 flex items-center justify-center hover:bg-muted rounded-md"
                title="Complete"
                onClick={() => handleCategorySelect('complete')}
              >
                <div className="p-1 size-7 rounded-full border border-input flex items-center justify-center">
                  <CheckCircleFillIcon size={14} />
                </div>
              </Button>
            )}
            {currentCategory !== 'creative' && (
              <Button
                variant="ghost"
                className="p-1 flex items-center justify-center hover:bg-muted rounded-md"
                title="Creative"
                onClick={() => handleCategorySelect('creative')}
              >
                <div className="p-1 size-7 rounded-full border border-input flex items-center justify-center">
                  <BotIcon size={14} />
                </div>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Provider icon with dropdown functionality */}
      <DropdownMenu open={isProviderDropdownOpen} onOpenChange={setIsProviderDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="p-0 h-auto hover:bg-transparent focus:ring-0 cursor-pointer"
            aria-label="Select provider"
          >
            <IconProviderDisplay
              selectedModelId={selectedModelId}
              className="transition-transform duration-300 hover:scale-110 cursor-pointer"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="center" 
          className="min-w-[150px] p-1 animate-in fade-in-80 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          style={{ 
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' 
          }}
        >
          {/* Show current provider first */}
          {!MAIN_PROVIDERS.includes(currentProvider) && (
            <DropdownMenuItem 
              key={currentProvider}
              className={cn(
                "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors bg-muted"
              )}
              onClick={() => handleProviderSelect(currentProvider)}
            >
              <IconProviderDisplay 
                selectedModelId={`${currentProvider}:${currentCategory}`} 
                className="size-5"
              />
              <span className="text-sm capitalize">{currentProvider}</span>
            </DropdownMenuItem>
          )}
          
          {/* Show main providers */}
          {MAIN_PROVIDERS.map((provider) => (
            provider !== currentProvider && (
              <DropdownMenuItem 
                key={provider}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
                onClick={() => handleProviderSelect(provider)}
              >
                <IconProviderDisplay 
                  selectedModelId={`${provider}:${currentCategory}`} 
                  className="size-5"
                />
                <span className="text-sm capitalize">{provider}</span>
              </DropdownMenuItem>
            )
          ))}
          
          {/* Show current provider if it's in MAIN_PROVIDERS */}
          {MAIN_PROVIDERS.includes(currentProvider) && (
            <DropdownMenuItem 
              key={`${currentProvider}-current`}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors bg-muted"
              onClick={() => handleProviderSelect(currentProvider)}
            >
              <IconProviderDisplay 
                selectedModelId={`${currentProvider}:${currentCategory}`} 
                className="size-5"
              />
              <span className="text-sm capitalize">{currentProvider}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}