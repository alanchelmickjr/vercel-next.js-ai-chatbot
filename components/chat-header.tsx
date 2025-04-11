'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';
import { useMemo, memo, useState, useEffect } from 'react';

import { QuickModelSelector } from '@/components/quick-model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon, VercelIcon } from './icons';
import { Settings2, ShieldAlert } from 'lucide-react';
import { useSidebar } from './ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { VisibilityType, VisibilitySelector } from './visibility-selector';
import { ThemeToggle } from './theme-toggle';
import { UserModelPreferences } from './user-model-preferences';
import { ModelManager } from './admin/model-manager';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from './ui/dialog';
import { isFeatureEnabled } from '@/lib/feature-flags';

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  onModelChange,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  onModelChange?: (newModelString: string) => void;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const { width: windowWidth } = useWindowSize();

  // Check if model preferences gear icon should be shown
  const showModelPreferencesGear = isFeatureEnabled('showModelPreferencesGear', 'user-id');
  
  // Check if admin icon should be shown (during development)
  const showAdminIcon = isFeatureEnabled('showAdminIcon', 'user-id');

  // Use useEffect to mark when client-side hydration is complete
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <>
      <header className="flex flex-nowrap sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-1">
        <SidebarToggle />
{/* Only render on client-side after hydration is complete */}
{isClient && (!open || windowWidth < 768) && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0"
        onClick={(e) => {
          e.preventDefault();
          // Use replace instead of push to avoid adding to history stack
          router.replace('/');
          // Don't call router.refresh() as it triggers unnecessary refreshes
        }}
      >
        <PlusIcon />
        <span className="xs:inline sr-only">New Chat</span>
      </Button>
    </TooltipTrigger>
    <TooltipContent>New Chat</TooltipContent>
  </Tooltip>
)}

        {/* !isReadonly && (
          <ModelSelector
            selectedModelId={selectedModelId}
            className="order-1 md:order-2"
            onModelChange={onModelChange}
          />
        )*/}

        {!isReadonly && (
          <VisibilitySelector
            chatId={chatId}
            selectedVisibilityType={selectedVisibilityType}
            className="order-3 md:order-4"
          />
        )}
        
        {isClient && showModelPreferencesGear && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 md:size-8 flex items-center justify-center"
                onClick={() => setPreferencesOpen(true)}
              >
                <Settings2 className="size-4 md:size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Model Preferences</TooltipContent>
          </Tooltip>
        )}
        
        {isClient && showAdminIcon && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 md:size-8 flex items-center justify-center"
                onClick={() => setAdminOpen(true)}
              >
                <ShieldAlert className="size-4 md:size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Admin: Model Manager</TooltipContent>
          </Tooltip>
        )}
        
        <ThemeToggle />
        {!isReadonly && (
          <QuickModelSelector
            selectedModelId={selectedModelId}
            className="ml-auto"
            onModelChange={onModelChange}
          />
        )}
      </header>

      <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Model Preferences</DialogTitle>
            <DialogDescription>
              Customize your model settings and preferences.
            </DialogDescription>
          </DialogHeader>
          <UserModelPreferences />
        </DialogContent>
      </Dialog>

      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Admin: Model Manager</DialogTitle>
            <DialogDescription>
              Manage model configurations and settings.
            </DialogDescription>
          </DialogHeader>
          <ModelManager />
        </DialogContent>
      </Dialog>
    </>
  );
}
export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  // Only re-render if any of these props change
  return (
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
