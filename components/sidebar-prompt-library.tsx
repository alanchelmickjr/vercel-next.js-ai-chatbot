'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LibraryIcon, PlusIcon, ShareIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { type User } from 'next-auth';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { PromptMarketplace } from '@/components/prompt-marketplace';
import { toast } from '@/components/toast';

type PromptSuggestion = {
  id: string;
  title: string;
  label: string;
  action: string;
  category?: string;
  visibility: 'private' | 'public';
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function SidebarPromptLibrary({ user }: { user: User | undefined }) {
  const router = useRouter();
  const [prompts, setPrompts] = useState<PromptSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  
  // Fetch user's prompt library
  useEffect(() => {
    const fetchPrompts = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/prompts/user?userId=${user.id}`);
        const data = await response.json();
        
        if (data && Array.isArray(data.prompts)) {
          setPrompts(data.prompts);
        }
      } catch (error) {
        console.error('Failed to fetch user prompts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrompts();
  }, [user?.id]);
  
  // Toggle prompt visibility between public/private
  const toggleVisibility = async (id: string, currentVisibility: 'private' | 'public') => {
    try {
      const newVisibility = currentVisibility === 'private' ? 'public' : 'private';
      
      const response = await fetch('/api/prompts/visibility', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          visibility: newVisibility,
        }),
      });
      
      if (response.ok) {
        // Update local state
        setPrompts(prompts.map(prompt => 
          prompt.id === id 
            ? { ...prompt, visibility: newVisibility } 
            : prompt
        ));
        
        toast({
          type: 'success',
          description: `Prompt is now ${newVisibility}`
        });
      } else {
        throw new Error('Failed to update visibility');
      }
    } catch (error) {
      console.error('Error updating prompt visibility:', error);
      toast({
        type: 'error',
        description: 'Failed to update prompt visibility'
      });
    }
  };
  
  // Execute a prompt
  const executePrompt = (prompt: PromptSuggestion) => {
    // Add to active conversation or create a new one
    router.push(`/?prompt=${encodeURIComponent(prompt.action)}`);
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium">My Prompt Library</h3>
          <div className="flex gap-1">
            <div className="size-6 animate-pulse bg-muted rounded-md"></div>
            <div className="size-6 animate-pulse bg-muted rounded-md"></div>
          </div>
        </div>
        <div className="space-y-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-md animate-pulse bg-muted h-8"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="p-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium px-2">My Prompt Library</h3>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setMarketplaceOpen(true)}
                >
                  <PlusIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add from Marketplace</TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {prompts.length === 0 ? (
          <div className="text-center py-3 text-muted-foreground text-sm">
            <p>No saved prompts yet</p>
            <Button 
              variant="link" 
              className="px-0 h-auto text-xs"
              onClick={() => setMarketplaceOpen(true)}
            >
              Browse the marketplace
            </Button>
          </div>
        ) : (
          <ul className="space-y-1">
            {prompts.map(prompt => (
              <li key={prompt.id} className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 justify-start text-sm truncate grow"
                  onClick={() => executePrompt(prompt)}
                >
                  <LibraryIcon className="mr-2 size-4 shrink-0" />
                  <span className="truncate">{prompt.title}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => toggleVisibility(prompt.id, prompt.visibility)}
                >
                  <ShareIcon 
                    className={`size-4 ${prompt.visibility === 'public' ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Marketplace Sheet */}
      <Sheet open={marketplaceOpen} onOpenChange={setMarketplaceOpen}>
        <SheetContent side="right" className="w-full md:w-[600px] sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Prompt Marketplace</SheetTitle>
          </SheetHeader>
          <PromptMarketplace />
        </SheetContent>
      </Sheet>
    </>
  );
}