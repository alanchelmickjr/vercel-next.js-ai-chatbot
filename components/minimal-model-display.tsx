'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

interface MinimalModelDisplayProps {
  modelId: string;
  className?: string;
}

export function MinimalModelDisplay({ modelId, className }: MinimalModelDisplayProps) {
  // Get the display name for the model - memoized to prevent recalculation
  const modelName = useMemo(() => {
    if (!modelId) {
      return 'AI Model';
    }
    
    // If the model ID is in provider:model format, extract the parts
    if (modelId.includes(':')) {
      const [provider, model] = modelId.split(':');
      
      // Format the model part as a readable string
      const formattedModel = model.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      // For certain providers, use a more user-friendly display
      if (provider === 'anthropic') {
        if (model.includes('claude-3-5-haiku')) return 'Quick';
        if (model.includes('claude-3-5-sonnet')) return 'Complete';
        if (model.includes('claude-3-7-sonnet')) return 'Advanced';
        if (model.includes('haiku')) return 'Quick';
        if (model.includes('sonnet')) return 'Complete';
        if (model.includes('opus')) return 'Advanced';
      }
      
      if (provider === 'openai') {
        if (model.includes('gpt-4o-mini')) return 'Quick';
        if (model.includes('gpt-4o')) return 'Complete';
        if (model.includes('gpt-4-turbo')) return 'Advanced';
        if (model.includes('dall-e-3')) return 'Image';
      }
      
      // Return the formatted model name
      return formattedModel;
    }
    
    // Fallback to a formatted version of the model ID
    return modelId.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }, [modelId]);
  
  return (
    <Badge variant="outline" className={`font-normal ${className || ''}`}>
      {modelName}
    </Badge>
  );
}