'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogoOpenAI, LogoAnthropic, LogoGoogle } from './icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ModelBadge({
  selectedModelId,
  className,
}: {
  selectedModelId: string;
  className?: string;
}) {
  // Get provider and model name from the selectedModelId
  const modelInfo = useMemo(() => {
    if (!selectedModelId) {
      return { provider: '', model: '', displayName: 'AI Model' };
    }
    
    // If the model ID is in provider:model format, extract the parts
    if (selectedModelId.includes(':')) {
      const [provider, model] = selectedModelId.split(':');
      
      // Format the model part as a readable string
      const formattedModel = model.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      return {
        provider,
        model,
        displayName: formattedModel
      };
    }
    
    // Fallback for non-standard format
    return {
      provider: '',
      model: selectedModelId,
      displayName: selectedModelId
    };
  }, [selectedModelId]);
  
  // Determine which provider icon to show
  const ProviderIcon = useMemo(() => {
    const provider = modelInfo.provider.toLowerCase();
    
    if (provider.includes('openai')) {
      return LogoOpenAI;
    } else if (provider.includes('anthropic')) {
      return LogoAnthropic;
    } else if (provider.includes('google')) {
      return LogoGoogle;
    }
    
    // Default to OpenAI as fallback
    return LogoOpenAI;
  }, [modelInfo.provider]);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "p-1 h-7 w-7 rounded-full flex items-center justify-center",
            className
          )}
          title={`Current model: ${modelInfo.displayName}`}
        >
          <ProviderIcon size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-auto">
      </DropdownMenuContent>
    </DropdownMenu>
  );
}