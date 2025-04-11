'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

export function CurrentModelDisplay({ modelId }: { modelId: string }) {
  // Get display name with fallbacks - memoized to prevent recalculation
  const modelDisplayName = useMemo(() => {
    // If the model ID is in provider:model format, extract the model part
    if (modelId.includes(':')) {
      const [provider, model] = modelId.split(':');
      
      // Format the model part as a readable string
      return model.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    
    // Final fallback - format the model ID as a readable string
    return modelId.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }, [modelId]);
  
  return (
    <Badge variant="outline" className="font-normal">
      {modelDisplayName}
    </Badge>
  );
}