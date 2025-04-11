'use client';

import { createElement, useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BotIcon, CheckCircleFillIcon, LightningIcon } from './icons';
import { useRegistry } from '@/hooks/use-registry';

const CATEGORY_ICONS = {
  quick: { icon: LightningIcon, title: 'Quick' },
  complete: { icon: CheckCircleFillIcon, title: 'Complete' },
  creative: { icon: BotIcon, title: 'Creative' }
} as const;

type Category = keyof typeof CATEGORY_ICONS;

export function IconCategoryDisplay({
  selectedModelId,
  className,
  onClick,
}: {
  selectedModelId: string;
  className?: string;
  onClick?: () => void;
}) {
  const { getModel } = useRegistry();
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  
  // Determine the category based on the model ID
  useEffect(() => {
    // If the model ID contains a category indicator, use that
    if (selectedModelId.includes('quick')) {
      setCurrentCategory('quick');
    } else if (selectedModelId.includes('complete')) {
      setCurrentCategory('complete');
    } else if (selectedModelId.includes('creative')) {
      setCurrentCategory('creative');
    } else {
      // For provider:model format, we can infer from the model ID
      // This is a simplified approach - in a real implementation,
      // you might want to fetch the model details from the registry
      const modelParts = selectedModelId.split(':');
      if (modelParts.length === 2) {
        const provider = modelParts[0];
        const model = modelParts[1];
        
        // Simplified logic based on provider and model
        if (provider === 'anthropic') {
          setCurrentCategory('creative');
        } else if (model.includes('gpt-4o')) {
          setCurrentCategory('complete');
        } else {
          setCurrentCategory('quick');
        }
      } else {
        setCurrentCategory('quick'); // Default
      }
    }
  }, [selectedModelId]);

  return (
    <div
      className={cn("flex items-center space-x-1", className)}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {/* On mobile, only show the active category with improved sizing */}
      <div className="flex xs:hidden">
        {currentCategory && CATEGORY_ICONS[currentCategory as Category] && (
          <div
            className="p-1 size-6 rounded-full bg-foreground text-background flex items-center justify-center"
            title={CATEGORY_ICONS[currentCategory as Category].title}
          >
            {createElement(CATEGORY_ICONS[currentCategory as Category].icon, { size: 12 })}
          </div>
        )}
      </div>

      {/* On desktop, show all categories */}
      <div className="hidden xs:flex items-center space-x-1">
        {(Object.entries(CATEGORY_ICONS) as [Category, typeof CATEGORY_ICONS[Category]][]).map(([category, { icon: Icon, title }]) => (
          <div
            key={category}
            className={cn(
              "p-1 size-7 rounded-full flex items-center justify-center",
              currentCategory === category
                ? "bg-foreground text-background"
                : "border border-input text-foreground"
            )}
            title={title}
          >
            <Icon size={14} />
          </div>
        ))}
      </div>
    </div>
  );
}