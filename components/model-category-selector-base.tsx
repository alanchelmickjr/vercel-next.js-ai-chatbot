'use client';

import { useCallback, useEffect, useMemo, useState, startTransition, useOptimistic } from 'react';
import { usePreferences } from '@/hooks/use-preferences';
import { useRegistry } from '@/hooks/use-registry';
import { categoryModelMap } from '@/lib/ai/provider-registry';

export type CategoryName = 'quick' | 'complete' | 'creative' | null;

export type ModelCategorySelectorHookResult = {
  optimisticModelId: string;
  currentCategory: CategoryName;
  activeType: string;
  handleCategorySelect: (categoryName: string) => void;
  isLoading: boolean;
};

/**
 * A hook that handles the shared logic for model category selection
 * Uses the provider registry system instead of hardcoded mappings
 */
export function useModelCategorySelector(
  selectedModelId: string,
  onModelChange?: (newModelString: string) => void
): ModelCategorySelectorHookResult {
  const [optimisticModelId, setOptimisticModelId] = useOptimistic(selectedModelId);
  const { setPreferredModel } = usePreferences();
  const { getCategoryForModel } = useRegistry();
  const [currentCategory, setCurrentCategory] = useState<CategoryName>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Extract provider and model from the selectedModelId
  const providerAndModel = useMemo(() => {
    if (!selectedModelId || !selectedModelId.includes(':')) {
      return { provider: 'anthropic', model: '' };
    }
    
    const [provider, model] = selectedModelId.split(':');
    return { provider, model };
  }, [selectedModelId]);
  
  // Determine the active type based on the model
  const activeType = useMemo(() => {
    const { model } = providerAndModel;
    
    if (model.includes('vision')) {
      return 'vision';
    }
    
    return 'text';
  }, [providerAndModel]);

  // Get the current category from the registry
  useEffect(() => {
    const fetchCategory = async () => {
      if (!selectedModelId) return;
      
      setIsLoading(true);
      try {
        const category = await getCategoryForModel(selectedModelId);
        setCurrentCategory(category as CategoryName);
      } catch (error) {
        console.error('Error getting category for model:', error);
        setCurrentCategory(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategory();
  }, [selectedModelId, getCategoryForModel]);

  // Handle category selection
  const handleCategorySelect = useCallback(async (categoryName: string) => {
    setIsLoading(true);
    
    try {
      // Get the type-specific category name if needed
      const typePrefix = activeType === 'vision' ? 'vision-' : '';
      const fullCategoryName = `${typePrefix}${categoryName}`;
      
      // Try to get the model from the registry's categoryModelMap
      // First try with type prefix, then without
      let newModelId = categoryModelMap.get(fullCategoryName) || categoryModelMap.get(categoryName);
      
      if (newModelId) {
        // Update optimistic UI state first
        startTransition(() => {
          setOptimisticModelId(newModelId!);
          setCurrentCategory(categoryName as CategoryName);
        });
        
        // Then update parent state via callback
        if (onModelChange) {
          onModelChange(newModelId);
        }
      }
    } catch (error) {
      console.error('Error selecting category:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeType, onModelChange, setOptimisticModelId]);

  return {
    optimisticModelId,
    currentCategory,
    activeType,
    handleCategorySelect,
    isLoading
  };
}