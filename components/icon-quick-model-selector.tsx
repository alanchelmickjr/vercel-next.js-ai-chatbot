'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BotIcon, CheckCircleFillIcon, LightningIcon } from './icons';

const CATEGORY_ICONS = {
  quick: { icon: LightningIcon, title: 'Quick' },
  complete: { icon: CheckCircleFillIcon, title: 'Complete' },
  creative: { icon: BotIcon, title: 'Creative' }
} as const;

type Category = keyof typeof CATEGORY_ICONS;

export function IconQuickModelSelector({
  selectedModelId,
  className,
  onModelChange,
}: {
  selectedModelId: string;
  className?: string;
  onModelChange?: (newModelString: string) => void;
}) {
  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {(Object.entries(CATEGORY_ICONS) as [Category, typeof CATEGORY_ICONS[Category]][]).map(([category, { icon: Icon, title }]) => (
        <Button
          key={category}
          variant="outline"
          size="sm"
          onClick={() => onModelChange && onModelChange(category)}
          className="p-1 size-7 rounded-full text-foreground hover:bg-foreground hover:text-background"
          title={title}
        >
          <Icon size={14} />
        </Button>
      ))}
    </div>
  );
}