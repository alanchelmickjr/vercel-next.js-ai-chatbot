'use client'

import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/toast';

type PromptSuggestion = {
  id: string;
  userId: string;
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

export function PromptMarketplace() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<PromptSuggestion[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptSuggestion | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Fetch user ID
  useEffect(() => {
    // Fetch the current user ID from the server
    const getUserId = async () => {
      try {
        const response = await fetch('/api/user');
        
        // Check if the response is OK before trying to parse JSON
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data && data.userId) {
          setUserId(data.userId);
        }
      } catch (error) {
        // More graceful error handling - don't break the UI
        console.error('Failed to fetch user ID:', error);
        // Continue without a user ID - features requiring authentication will be disabled
      }
    };
    
    getUserId();
  }, []);

  // Fetch public prompts and extract categories
  useEffect(() => {
    async function fetchPublicPrompts() {
      try {
        setLoading(true);
        const response = await fetch('/api/prompts/public');
        
        // Check if the response is OK before trying to parse JSON
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && Array.isArray(data.prompts)) {
          setPrompts(data.prompts);
          
          // Extract unique categories
          const uniqueCategories = Array.from(
            new Set(
              data.prompts
                .filter((p: PromptSuggestion) => p.category)
                .map((p: PromptSuggestion) => p.category)
            )
          );
          setCategories(uniqueCategories as string[]);
        } else {
          // Handle case where data.prompts is not an array
          setPrompts([]);
          setCategories([]);
        }
      } catch (error) {
        console.error('Failed to fetch public prompts:', error);
        // Use fallback data instead of showing an error toast
        setPrompts([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPublicPrompts();
  }, []);

  // Add prompt to user's library
  const addToLibrary = async (prompt: PromptSuggestion) => {
    if (!userId) {
      console.log('User not signed in, cannot add prompt to library');
      toast({
        type: 'error',
        description: 'Please sign in to add prompts to your library'
      });
      return;
    }

    try {
      const response = await fetch('/api/prompts/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: prompt.title,
          label: prompt.label,
          action: prompt.action,
          category: prompt.category,
          visibility: 'private', // Default to private when adding to library
        }),
      });

      // Check if the response is OK before proceeding
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      console.log('Prompt successfully added to library');
      toast({
        type: 'success',
        description: 'Prompt added to your library'
      });
      setShowDialog(false);
    } catch (error) {
      console.error('Error saving prompt:', error);
      // Show error toast but don't crash the application
      toast({
        type: 'error',
        description: 'Failed to add prompt to your library'
      });
    }
  };

  // Filter prompts by category
  const filteredPrompts = selectedTab === 'all'
    ? prompts
    : prompts.filter(p => p.category === selectedTab);

  // Open prompt details dialog
  const openPromptDetails = (prompt: PromptSuggestion) => {
    setSelectedPrompt(prompt);
    setShowDialog(true);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <h1 className="text-2xl font-bold mb-6 px-6">Prompt Marketplace</h1>
      
      {loading ? (
        <div className="flex-1 flex justify-center items-center h-full">
          <div className="animate-spin rounded-full size-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      ) : (
        <>
          <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab}>
            <div className="overflow-x-auto pb-2 -mx-6 px-6">
              <TabsList className="mb-4 flex whitespace-nowrap w-max min-w-full">
                <TabsTrigger value="all" className="flex-shrink-0">All</TabsTrigger>
                {categories.map(category => (
                  <TabsTrigger key={category} value={category} className="flex-shrink-0">
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value={selectedTab} className="mt-0 flex-1 overflow-auto px-6">
              {filteredPrompts.length === 0 ? (
                <div className="text-center py-10 h-full flex items-center justify-center">
                  <p className="text-muted-foreground">No prompts found in this category</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min pb-6">
                  {filteredPrompts.map(prompt => (
                    <Card key={prompt.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openPromptDetails(prompt)}>
                      <div className="flex flex-col h-full">
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="font-medium text-lg truncate">{prompt.title}</h3>
                          {prompt.category && (
                            <Badge variant="outline">{prompt.category}</Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm mb-4 grow line-clamp-2">{prompt.label}</p>
                        <Button size="sm" variant="outline" className="mt-auto w-full">
                          View Details
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Prompt details dialog */}
          {selectedPrompt && (
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{selectedPrompt.title}</DialogTitle>
                  <DialogDescription>
                    {selectedPrompt.category && (
                      <Badge variant="outline" className="mt-2">{selectedPrompt.category}</Badge>
                    )}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground mb-4">{selectedPrompt.label}</p>
                  
                  <h4 className="text-sm font-medium mb-1">Prompt</h4>
                  <div className="bg-muted p-3 rounded text-sm font-mono whitespace-pre-wrap break-words">
                    {selectedPrompt.action}
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => addToLibrary(selectedPrompt)}>
                    Add to My Library
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
    </div>
  );
}