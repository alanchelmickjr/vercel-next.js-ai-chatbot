/**
 * Suggested Actions Component
 *
 * This component displays a grid of suggested prompt actions that users can click on
 * to quickly start conversations with the AI. It features:
 *
 * - Two categories of suggestions: Personal and Community
 * - Dynamic tag parsing for template-based prompts with placeholders
 * - Star rating system for community suggestions
 * - Expandable/collapsible sections
 * - Automatic refresh of suggestions at random intervals
 * - Fallback suggestions when API calls fail
 *
 * The component handles loading states, empty states, and error conditions gracefully.
 * It communicates with multiple API endpoints to fetch, rate, and process suggestions.
 */

'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { CachedSuggestion } from '@/lib/vercel-kv/client';
import { extractDynamicTags, parseDynamicTags } from '@/lib/ai/dynamic-tag-parser';
import { ChevronDown, ChevronUp, Star, Edit, Share2, SaveIcon, Check, AlertCircle, Settings2, Users, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { PromptMarketplace } from './prompt-marketplace';
import { toast } from 'sonner';

// Disable all debug logging
const DEBUG = false;

/**
 * Props for the SuggestedActions component
 * @property chatId - The ID of the current chat conversation
 * @property append - Function to append a new message to the chat
 */
interface SuggestedActionsProps {
  chatId: string;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
}

/**
 * Pure component implementation of SuggestedActions
 * This is wrapped with React.memo at the bottom of the file for performance optimization
 */
function PureSuggestedActions({ chatId, append }: SuggestedActionsProps) {
  // State management for suggestions and UI controls
  const [personalSuggestions, setPersonalSuggestions] = useState<CachedSuggestion[]>([]); // User's personal suggestions
  const [communitySuggestions, setCommunitysuggestions] = useState<CachedSuggestion[]>([]); // Community-shared suggestions
  const [isLoading, setIsLoading] = useState(true); // Controls loading state display
  const [activeSource, setActiveSource] = useState<'all' | 'personal' | 'community'>('all'); // Filter for suggestion source
  const [activeSort, setActiveSort] = useState<'recent' | 'top-rated'>('recent'); // Sort order for suggestions
  const [personalExpanded, setPersonalExpanded] = useState(true); // Controls expansion of personal section
  const [communityExpanded, setCommunityExpanded] = useState(true); // Controls expansion of community section
  const [ratingInProgress, setRatingInProgress] = useState<string | null>(null); // Tracks which suggestion is being rated
  const [managePromptsOpen, setManagePromptsOpen] = useState(false); // Controls manage prompts dialog visibility
  const [marketplaceOpen, setMarketplaceOpen] = useState(false); // Controls community marketplace dialog visibility
  const [newPromptDialogOpen, setNewPromptDialogOpen] = useState(false); // Controls new prompt dialog visibility
  const [savedSuggestions, setSavedSuggestions] = useState<Set<string>>(new Set()); // Tracks saved community suggestions
  const [editDialogOpen, setEditDialogOpen] = useState(false); // Controls edit dialog visibility
  const [shareDialogOpen, setShareDialogOpen] = useState(false); // Controls share dialog visibility
  const [currentEditingSuggestion, setCurrentEditingSuggestion] = useState<CachedSuggestion | null>(null); // Currently editing suggestion
  const [currentSharingSuggestion, setCurrentSharingSuggestion] = useState<CachedSuggestion | null>(null); // Currently sharing suggestion
  const [editFormData, setEditFormData] = useState({ title: '', label: '', action: '', complexPrompt: '' }); // Edit form data
  
  // User identification is handled server-side through cookies
  // This prevents exposing user IDs in client-side code
  const userId = undefined; // Let the server handle user identification
  
  // Load saved suggestions from localStorage on mount
  useEffect(() => {
    try {
      const savedItems = localStorage.getItem('savedCommunitySuggestions');
      if (savedItems) {
        setSavedSuggestions(new Set(JSON.parse(savedItems)));
      }
    } catch (error) {
      console.error('Error loading saved suggestions:', error);
    }
  }, []);

  /**
   * Fallback suggestions used when API calls fail
   * These provide a graceful degradation experience with useful default prompts
   * Each suggestion includes:
   * - id: Unique identifier
   * - title: Main display title
   * - label: Subtitle/description
   * - action: The prompt text with dynamic tags in {{tag}} format
   * - complexPrompt: Additional context for the AI to better understand the request
   */
  const fallbackSuggestions: CachedSuggestion[] = [
    {
      id: '1',
      title: 'Generate an Image of...',
      label: 'random ai art',
      action: 'Generate an Image of {{random art, painting, or photo... be creative}}.',
      complexPrompt: 'You are an expert image generator. Create a detailed, high-quality image based on the user\'s description. Consider composition, lighting, style, and mood to create a visually appealing result.',
    },
    {
      id: '2',
      title: 'Write Py code to...',
      label: `random coding algorithm`,
      action: `Write code to demonstrate {{coding algorithm}}`,
      complexPrompt: 'You are an expert programmer with deep knowledge of algorithms and data structures. Provide clean, well-commented code with explanations of the algorithm\'s time and space complexity. Include examples of how the algorithm works on sample inputs.',
    },
    {
      id: '3',
      title: 'Help me write a document...',
      label: `about an impactful subject`,
      action: `Help me create a document {{create an impactful but short document on a random subject}}`,
      complexPrompt: 'You are a professional writer with expertise in creating impactful documents. Focus on clarity, structure, and persuasive language. Include an introduction, main points with supporting evidence, and a strong conclusion.',
    },
    {
      id: '4',
      title: 'What is the weather in...',
      label: 'in random city',
      action: 'What is the weather in {{city}}',
      complexPrompt: 'You are a meteorologist with expertise in weather patterns and forecasting. Provide detailed information about current weather conditions, temperature, humidity, wind speed, and precipitation. Include a short-term forecast for the next 24 hours.',
    },
  ];

  /**
   * Fetches suggestions from the API based on current filter settings
   * Separates results into personal and community categories
   * Falls back to default suggestions if the API call fails
   */
  const fetchSuggestions = useCallback(async () => {
    try {
      setIsLoading(true);
      // Request suggestions with current filter parameters
      const response = await fetch(`/api/prompts/suggestions?source=${activeSource}&sort=${activeSort}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      
      const data = await response.json();
      
      // Separate suggestions by source for different UI treatments
      const personal: CachedSuggestion[] = [];
      const community: CachedSuggestion[] = [];
      
      data.suggestions.forEach((suggestion: CachedSuggestion) => {
        if (suggestion.source === 'community') {
          community.push(suggestion);
        } else {
          personal.push(suggestion);
        }
      });
      
      // Update state with fetched suggestions
      setPersonalSuggestions(personal);
      setCommunitysuggestions(community);
    } catch (error) {
      // Silently handle errors and use fallback suggestions
      // This ensures users always have some suggestions available
    } finally {
      setIsLoading(false);
    }
  }, [activeSource, activeSort]);
  
  /**
   * Sets up periodic refresh of suggestions at random intervals
   * Uses a random interval between 15-60 seconds to:
   * 1. Prevent predictable network patterns
   * 2. Reduce server load by staggering requests
   * 3. Keep content fresh without being distracting
   */
  /**
   * Single useEffect to handle all suggestion fetching logic:
   * 1. Initial fetch on mount
   * 2. Periodic refresh at random intervals
   *
   * This consolidates the three separate useEffect hooks that were causing
   * multiple redundant API calls and refreshes.
   */
  useEffect(() => {
    // Initial fetch on mount
    fetchSuggestions();
    
    // Set up periodic refresh at much longer intervals to prevent excessive refreshes
    // Using a 5-minute interval instead of 15-60 seconds
    const intervalId = setInterval(() => {
      // Only fetch if the component is mounted and visible in the viewport
      if (document.visibilityState === 'visible') {
        fetchSuggestions();
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [fetchSuggestions]);

  /**
   * Processes a suggestion click with dynamic tag parsing
   *
   * This function:
   * 1. Updates the URL to reflect the current chat
   * 2. Extracts dynamic tags from the action text (e.g., {{city}})
   * 3. Determines if user input is needed for any tags
   * 4. Appends the message to the chat with appropriate metadata
   * 5. Falls back to simple text if parsing fails
   *
   * @param action - The prompt text with potential dynamic tags
   * @param complexPrompt - Optional additional context for the AI
   */
  const handleSuggestionClick = useCallback(async (action: string, complexPrompt?: string) => {
    try {
      // Extract tags from the action using the dynamic tag parser
      const tags = extractDynamicTags(action);
      
      // Determine if any tags require user input (non-auto tags)
      const hasUserInputTags = tags.some(tag => !tag.isAutoFill);
      
      // No logging needed
      
      // Append the message with metadata for the multimodal input component
      // This allows proper handling of both AI-fillable and user-input tags
      append({
        role: 'user',
        content: action,
        // Add custom properties for tag processing
        tags: tags,
        complexPrompt: complexPrompt, // Additional context for the AI
        needsUserInput: hasUserInputTags, // Flag indicating if user input is needed
        systemAction: !hasUserInputTags // Indicate this is a system-initiated action if no user input needed
      } as any);
    } catch (error) {
      // Silently handle errors and fallback to simple text prompt if parsing fails
      append({
        role: 'user',
        content: action,
      });
    }
  }, [append]);

  /**
   * Toggle handlers for expanding/collapsing suggestion sections
   */
  const togglePersonalExpanded = () => setPersonalExpanded(!personalExpanded);
  const toggleCommunityExpanded = () => setCommunityExpanded(!communityExpanded);
  
  /**
   * Handles the rating of a suggestion
   *
   * This function:
   * 1. Sets a loading state for the specific suggestion being rated
   * 2. Sends the rating to the API
   * 3. Refreshes suggestions to show updated ratings
   * 4. Handles errors gracefully
   *
   * @param id - The ID of the suggestion being rated
   * @param rating - The rating value (1-5)
   */
  const handleRateSuggestion = async (id: string, rating: number, isCommunity = false) => {
    try {
      // For community suggestions, check if it's saved first
      if (isCommunity && !savedSuggestions.has(id)) {
        toast.error("Please save this suggestion before rating it", {
          icon: <AlertCircle className="text-red-500" size={18} />,
          duration: 3000
        });
        return;
      }
      
      // Set loading state for this specific suggestion
      setRatingInProgress(id);
      
      // Send rating to the API
      const response = await fetch('/api/prompts/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, rating }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to rate suggestion');
      }
      
      toast.success("Rating submitted successfully", {
        icon: <Star className="text-amber-400 fill-amber-400" size={18} />,
        duration: 2000
      });
      
      // Refresh suggestions to show updated ratings
      fetchSuggestions();
    } catch (error) {
      // Silently handle errors
      toast.error("Failed to submit rating", {
        icon: <AlertCircle className="text-red-500" size={18} />,
        duration: 3000
      });
    } finally {
      // Clear loading state regardless of success/failure
      setRatingInProgress(null);
    }
  };
  
  /**
   * Handles saving a community suggestion to personal collection
   *
   * @param suggestion - The suggestion to save
   */
  const handleSaveSuggestion = async (suggestion: CachedSuggestion) => {
    try {
      // Send save request to the API
      const response = await fetch('/api/prompts/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: suggestion.id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save suggestion');
      }
      
      // Update local state to track saved suggestions
      const updatedSaved = new Set(savedSuggestions);
      updatedSaved.add(suggestion.id);
      setSavedSuggestions(updatedSaved);
      
      // Save to localStorage for persistence
      localStorage.setItem('savedCommunitySuggestions', JSON.stringify([...updatedSaved]));
      
      toast.success("Suggestion saved to your collection", {
        icon: <Check className="text-green-500" size={18} />,
        duration: 2000
      });
      
      // Refresh suggestions to show updated state
      fetchSuggestions();
    } catch (error) {
      // Silently handle errors
      toast.error("Failed to save suggestion", {
        icon: <AlertCircle className="text-red-500" size={18} />,
        duration: 3000
      });
    }
  };
  
  /**
   * Opens the edit dialog for a suggestion
   *
   * @param suggestion - The suggestion to edit
   * @param e - The click event
   */
  const handleEditClick = (suggestion: CachedSuggestion, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentEditingSuggestion(suggestion);
    setEditFormData({
      title: suggestion.title,
      label: suggestion.label,
      action: suggestion.action,
      complexPrompt: suggestion.complexPrompt || ''
    });
    setEditDialogOpen(true);
  };
  
  /**
   * Handles saving edited suggestion
   */
  const handleSaveEdit = async () => {
    if (!currentEditingSuggestion) return;
    
    try {
      // Send update request to the API
      const response = await fetch(`/api/prompts/${currentEditingSuggestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editFormData,
          id: currentEditingSuggestion.id
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update suggestion');
      }
      
      toast.success("Suggestion updated successfully", {
        icon: <Check className="text-green-500" size={18} />,
        duration: 2000
      });
      
      // Close dialog and refresh suggestions
      setEditDialogOpen(false);
      fetchSuggestions();
    } catch (error) {
      // Silently handle errors
      toast.error("Failed to update suggestion", {
        icon: <AlertCircle className="text-red-500" size={18} />,
        duration: 3000
      });
    }
  };
  
  /**
   * Opens the share dialog for a suggestion
   *
   * @param suggestion - The suggestion to share
   * @param e - The click event
   */
  const handleShareClick = (suggestion: CachedSuggestion, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSharingSuggestion(suggestion);
    setShareDialogOpen(true);
  };
  
  /**
   * Handles sharing a suggestion to the community
   */
  const handleShareToCommunity = async () => {
    if (!currentSharingSuggestion) return;
    
    try {
      // Send share request to the API
      const response = await fetch('/api/prompts/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: currentSharingSuggestion.id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to share suggestion');
      }
      
      toast.success("Suggestion shared with the community", {
        icon: <Check className="text-green-500" size={18} />,
        duration: 2000
      });
      
      // Close dialog and refresh suggestions
      setShareDialogOpen(false);
      fetchSuggestions();
    } catch (error) {
      // Silently handle errors
      toast.error("Failed to share suggestion", {
        icon: <AlertCircle className="text-red-500" size={18} />,
        duration: 3000
      });
    }
  };
  
  /**
   * Star Rating Component
   *
   * Renders a 5-star rating interface for a suggestion
   * Shows the current average rating with filled/half-filled stars
   * Allows users to submit their own rating
   * Displays the total number of ratings
   *
   * @param suggestion - The suggestion object containing rating data
   */
  const StarRating = ({ suggestion, isCommunity = false }: { suggestion: CachedSuggestion, isCommunity?: boolean }) => {
    // Parse rating data from the suggestion
    const averageRating = suggestion.averageRating ? parseFloat(suggestion.averageRating as string) : 0;
    const ratingCount = suggestion.ratingCount || 0;
    
    return (
      <div className="flex items-center">
        {/* Generate 5 star buttons */}
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={`star-${suggestion.id}-${star}`}
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the parent suggestion click
              e.preventDefault(); // Prevent default behavior
              handleRateSuggestion(suggestion.id, star, isCommunity);
            }}
            disabled={ratingInProgress === suggestion.id}
            className={`p-0.5 focus:outline-none transition-colors ${
              ratingInProgress === suggestion.id ? 'opacity-50' : ''
            }`}
            title={`Rate ${star} star${star !== 1 ? 's' : ''}`}
          >
            <Star
              size={14}
              className={`${
                // Full star
                averageRating >= star
                  ? 'text-amber-400 fill-amber-400'
                  // Half star (when rating is X.5)
                  : averageRating >= star - 0.5
                  ? 'text-amber-400 fill-amber-200'
                  // Empty star
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        {/* Show rating count if available */}
        {ratingCount > 0 && (
          <span className="text-xs text-muted-foreground ml-1 whitespace-nowrap">
            ({ratingCount})
          </span>
        )}
      </div>
    );
  };
  
  /**
   * Handler for changing the source filter
   * Updates state and triggers a re-fetch of suggestions
   *
   * @param source - The source filter to apply ('all', 'personal', or 'community')
   */
  const handleSourceChange = (source: 'all' | 'personal' | 'community') => {
    setActiveSource(source);
  };
  
  /**
   * Combines and filters suggestions based on current source filter
   * Falls back to default suggestions if no suggestions are available
   *
   * @returns An array of suggestions to display
   */
  const getAllSuggestions = () => {
    // If no suggestions are available from either source, use fallbacks
    if (personalSuggestions.length === 0 && communitySuggestions.length === 0) {
      return fallbackSuggestions;
    }
    
    const result: CachedSuggestion[] = [];
    
    // Add personal suggestions if the filter includes them
    if (activeSource === 'all' || activeSource === 'personal') {
      result.push(...personalSuggestions);
    }
    
    // Add community suggestions if the filter includes them
    if (activeSource === 'all' || activeSource === 'community') {
      result.push(...communitySuggestions);
    }
    
    // If filtering resulted in no suggestions, fall back to defaults
    return result.length > 0 ? result : fallbackSuggestions;
  };
  
  // Display loading state or suggestions
  return (
    <div data-testid="suggested-actions" className="w-full flex flex-col gap-4">
      {/* Hidden state for source filtering - we keep the state but remove the buttons */}
      
      {isLoading ? (
        // Loading placeholder
        <div className="grid sm:grid-cols-2 gap-2 w-full">
          {Array.from({ length: 4 }).map((_, index) => (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              key={`loading-${index}`}
              className={index > 1 ? 'hidden sm:block' : 'block'}
            >
              <div className="border rounded-xl px-4 py-3.5 h-16 bg-muted animate-pulse" />
            </motion.div>
          ))}
        </div>
      ) : (
        <>
          {/* Personal suggestions section */}
          {(activeSource === 'all' || activeSource === 'personal') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={togglePersonalExpanded}
                >
                  <h3 className="text-sm font-medium">Personal Suggestions</h3>
                  {personalExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent event bubbling
                      e.preventDefault(); // Prevent default behavior
                      setNewPromptDialogOpen(true);
                    }}
                    title="Create new prompt"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent event bubbling
                      e.preventDefault(); // Prevent default behavior
                      setManagePromptsOpen(true);
                    }}
                    title="Manage your prompts"
                  >
                    <Settings2 size={16} />
                  </button>
                </div>
              </div>
              
              {personalExpanded && (
                <div data-testid="suggested-actions" className="grid sm:grid-cols-2 gap-2 w-full">
                  {(personalSuggestions.length > 0 ? personalSuggestions : fallbackSuggestions).map((suggestedAction, index) => (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ delay: 0.05 * index }}
                      key={`personal-action-${suggestedAction.id || index}`}
                      className={index > 1 ? 'hidden sm:block' : 'block'}
                    >
                      <div className="relative">
                        <div
                          className="border rounded-xl px-4 py-3.5 text-sm flex flex-col w-full h-auto cursor-pointer hover:bg-gray-100/10 dark:hover:bg-gray-800/20 transition-colors"
                          data-testid="suggestion-button"
                          onClick={() => handleSuggestionClick(suggestedAction.action, suggestedAction.complexPrompt)}
                        >
                          {/* Action icons - positioned at the bottom right inside the box innocuously */}
                          <div className="absolute bottom-3 right-3 flex gap-1 pointer-events-none">
                            <button
                              className="p-1 rounded-full bg-gray-100/30 dark:bg-gray-800/30 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm pointer-events-auto"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent event bubbling
                                e.preventDefault(); // Prevent default behavior
                                handleEditClick(suggestedAction, e);
                              }}
                              title="Edit prompt"
                            >
                              <Edit size={13} className="text-gray-500" />
                            </button>
                            <button
                              className="p-1 rounded-full bg-gray-100/30 dark:bg-gray-800/30 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm pointer-events-auto"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent event bubbling
                                e.preventDefault(); // Prevent default behavior
                                handleShareClick(suggestedAction, e);
                              }}
                              title="Share prompt with community"
                            >
                              <Share2 size={13} className="text-amber-400/70" />
                            </button>
                            <div className="bg-gray-100/30 dark:bg-gray-800/30 rounded-full p-0.5 pointer-events-auto">
                              <StarRating suggestion={suggestedAction} />
                            </div>
                          </div>
                          
                          {/* Content */}
                          <span className="font-medium">{suggestedAction.title}</span>
                          <span className="text-muted-foreground">
                            {suggestedAction.label}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Community suggestions section */}
          {(activeSource === 'all' || activeSource === 'community') && communitySuggestions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={toggleCommunityExpanded}
                >
                  <Users size={16} className="text-amber-500" />
                  <h3 className="text-sm font-medium text-amber-500">Community Suggestions</h3>
                  {communityExpanded ? <ChevronUp size={16} className="text-amber-500" /> : <ChevronDown size={16} className="text-amber-500" />}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault(); // Prevent default behavior
                      // Open the community prompts marketplace instead of manage prompts
                      setMarketplaceOpen(true);
                    }}
                    className="p-1 rounded-full hover:bg-amber-100/30 dark:hover:bg-amber-800/30 transition-colors"
                    title="Browse community prompts"
                  >
                    <Share2 size={16} className="text-amber-500" />
                  </button>
                </div>
              </div>
              
              {communityExpanded && (
                <div className="grid sm:grid-cols-2 gap-2 w-full">
                  {communitySuggestions.map((suggestedAction, index) => (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ delay: 0.05 * index }}
                      key={`community-action-${suggestedAction.id || index}`}
                      className={index > 1 ? 'hidden sm:block' : 'block'}
                    >
                      <div className="relative">
                        <div
                          className="border border-amber-200/30 rounded-xl px-4 py-3.5 text-sm flex flex-col w-full h-auto cursor-pointer hover:bg-amber-50/10 transition-colors"
                          onClick={() => handleSuggestionClick(suggestedAction.action, suggestedAction.complexPrompt)}
                        >
                          {/* Action icons - positioned at the top right inside the box */}
                          <div className="absolute bottom-3 right-3 flex gap-1 pointer-events-none">
                            <button
                              className="p-1 rounded-full bg-amber-100/10 hover:bg-amber-100/20 transition-colors shadow-sm pointer-events-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault(); // Prevent default behavior
                                handleSaveSuggestion(suggestedAction);
                              }}
                              title="Save prompt to your collection"
                              disabled={savedSuggestions.has(suggestedAction.id)}
                            >
                              {savedSuggestions.has(suggestedAction.id) ? (
                                <Check size={13} className="text-green-500" />
                              ) : (
                                <SaveIcon size={13} className="text-amber-400/70" />
                              )}
                            </button>
                            <div className="bg-amber-100/10 rounded-full p-0.5 pointer-events-auto">
                              {/* Only show rating if saved */}
                              {savedSuggestions.has(suggestedAction.id) ? (
                                <StarRating suggestion={suggestedAction} />
                              ) : (
                                <div className="flex items-center">
                                  <span className="text-xs text-amber-400/50 italic px-1">Save to rate</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Content */}
                          <span className="font-medium text-amber-500">{suggestedAction.title}</span>
                          <span className="text-amber-400/70">
                            {suggestedAction.label}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Suggestion</DialogTitle>
            <DialogDescription>
              Modify your prompt details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title</Label>
              <Input
                id="title"
                value={editFormData.title}
                onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="label" className="text-right">Label</Label>
              <Input
                id="label"
                value={editFormData.label}
                onChange={(e) => setEditFormData({...editFormData, label: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="action" className="text-right">Prompt</Label>
              <Textarea
                id="action"
                value={editFormData.action}
                onChange={(e) => setEditFormData({...editFormData, action: e.target.value})}
                className="col-span-3"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="complexPrompt" className="text-right">System Prompt</Label>
              <Textarea
                id="complexPrompt"
                value={editFormData.complexPrompt}
                onChange={(e) => setEditFormData({...editFormData, complexPrompt: e.target.value})}
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const saveEdit = async () => {
                  await handleSaveEdit();
                };
                saveEdit();
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Share with Community</DialogTitle>
            <DialogDescription>
              Share your prompt with other users.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Share this suggestion with the community. Other users will be able to see and use it.
            </p>
            {currentSharingSuggestion && (
              <div className="border rounded-xl p-4 mb-4">
                <h3 className="font-medium">{currentSharingSuggestion.title}</h3>
                <p className="text-sm text-muted-foreground">{currentSharingSuggestion.label}</p>
                <p className="text-xs mt-2 text-muted-foreground">Prompt: {currentSharingSuggestion.action}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const shareToCommunity = async () => {
                  await handleShareToCommunity();
                };
                shareToCommunity();
              }}
            >
              Share with Community
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Manage Prompts Dialog */}
      <Dialog open={managePromptsOpen} onOpenChange={setManagePromptsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Your Prompts</DialogTitle>
            <DialogDescription>
              View, edit, and organize your personal and saved prompts.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Your Personal Prompts</h3>
              <Button size="sm" onClick={() => {
                setManagePromptsOpen(false);
                setNewPromptDialogOpen(true);
              }}>
                <Plus className="mr-2 size-4" />
                Create New
              </Button>
            </div>
            
            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left font-medium">Title</th>
                    <th className="px-4 py-2 text-left font-medium">Label</th>
                    <th className="px-4 py-2 text-left font-medium">Shared</th>
                    <th className="px-4 py-2 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {personalSuggestions.length > 0 ? (
                    personalSuggestions.map((suggestion) => (
                      <tr key={suggestion.id} className="border-b hover:bg-muted/20">
                        <td className="px-4 py-2">{suggestion.title}</td>
                        <td className="px-4 py-2 text-muted-foreground">{suggestion.label}</td>
                        <td className="px-4 py-2">
                          {suggestion.visibility === 'public' ? (
                            <span className="text-green-500 flex items-center gap-1">
                              <Check size={14} /> Public
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Private</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setManagePromptsOpen(false);
                                handleEditClick(suggestion, new MouseEvent('click') as any);
                              }}
                            >
                              <Edit size={14} className="mr-1" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setManagePromptsOpen(false);
                                handleShareClick(suggestion, new MouseEvent('click') as any);
                              }}
                            >
                              <Share2 size={14} className="mr-1" /> Share
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        You don&apos;t have any personal prompts yet. Create one to get started!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Saved Community Prompts</h3>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left font-medium">Title</th>
                      <th className="px-4 py-2 text-left font-medium">Label</th>
                      <th className="px-4 py-2 text-left font-medium">Rating</th>
                      <th className="px-4 py-2 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {communitySuggestions.filter(s => savedSuggestions.has(s.id)).length > 0 ? (
                      communitySuggestions
                        .filter(s => savedSuggestions.has(s.id))
                        .map((suggestion) => (
                          <tr key={suggestion.id} className="border-b hover:bg-muted/20">
                            <td className="px-4 py-2">{suggestion.title}</td>
                            <td className="px-4 py-2 text-muted-foreground">{suggestion.label}</td>
                            <td className="px-4 py-2">
                              <StarRating suggestion={suggestion} />
                            </td>
                            <td className="px-4 py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Remove from saved
                                  const updatedSaved = new Set(savedSuggestions);
                                  updatedSaved.delete(suggestion.id);
                                  setSavedSuggestions(updatedSaved);
                                  localStorage.setItem('savedCommunitySuggestions', JSON.stringify([...updatedSaved]));
                                  toast.success("Removed from saved prompts");
                                }}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          You haven&apos;t saved any community prompts yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* New Prompt Dialog */}
      <Dialog open={newPromptDialogOpen} onOpenChange={setNewPromptDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Prompt</DialogTitle>
            <DialogDescription>
              Create a new prompt to add to your personal collection.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-title" className="text-right">Title</Label>
              <Input
                id="new-title"
                value={editFormData.title}
                onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                className="col-span-3"
                placeholder="Generate an image of..."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-label" className="text-right">Label</Label>
              <Input
                id="new-label"
                value={editFormData.label}
                onChange={(e) => setEditFormData({...editFormData, label: e.target.value})}
                className="col-span-3"
                placeholder="a beautiful landscape"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-action" className="text-right">Prompt</Label>
              <Textarea
                id="new-action"
                value={editFormData.action}
                onChange={(e) => setEditFormData({...editFormData, action: e.target.value})}
                className="col-span-3"
                rows={3}
                placeholder="Generate an image of {{subject}}"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-complexPrompt" className="text-right">System Prompt</Label>
              <Textarea
                id="new-complexPrompt"
                value={editFormData.complexPrompt}
                onChange={(e) => setEditFormData({...editFormData, complexPrompt: e.target.value})}
                className="col-span-3"
                rows={3}
                placeholder="You are an expert image generator..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPromptDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const createPrompt = async () => {
                  try {
                    // Create new prompt
                    const response = await fetch('/api/prompts', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(editFormData),
                    });
                    
                    if (!response.ok) {
                      throw new Error('Failed to create prompt');
                    }
                    
                    toast.success("New prompt created successfully");
                    setNewPromptDialogOpen(false);
                    fetchSuggestions();
                  } catch (error) {
                    // Silently handle errors
                    toast.error("Failed to create prompt");
                  }
                };
                
                // Execute the async function
                createPrompt();
              }}
            >
              Create Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Community Marketplace Dialog - Full screen on mobile, large on desktop */}
      <Dialog open={marketplaceOpen} onOpenChange={setMarketplaceOpen}>
        <DialogContent className="w-screen max-w-screen h-screen max-h-screen p-0 md:p-6 overflow-hidden">
          <DialogHeader className="px-4 pt-4 md:px-0 md:pt-0">
            <DialogTitle>Community Prompt Marketplace</DialogTitle>
            <DialogDescription>
              Browse and save prompts shared by the community.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto h-[calc(100vh-120px)]">
            <div className="prompt-marketplace-container size-full">
              <PromptMarketplace />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Memoized version of the SuggestedActions component
 *
 * The second parameter to memo is a custom comparison function that always returns true,
 * effectively preventing re-renders when parent components change.
 *
 * This optimization is appropriate because:
 * 1. The component manages its own state internally
 * 2. It fetches its own data from APIs
 * 3. The append function reference should be stable (from useCallback in parent)
 * 4. The chatId should not change within a single chat session
 */
// The memo comparison function always returns true, which means this component
// will never re-render when props change. This could cause state inconsistencies.
/**
 * Memoized version of the SuggestedActions component
 *
 * Using a proper comparison function that checks if props have changed.
 * This allows necessary re-renders when props change while preventing
 * unnecessary re-renders.
 */
export const SuggestedActions = memo(PureSuggestedActions, (prevProps, nextProps) => {
  // Only re-render if chatId changes or append function reference changes
  return prevProps.chatId === nextProps.chatId && prevProps.append === nextProps.append;
});
