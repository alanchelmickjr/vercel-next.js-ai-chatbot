'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export function IconProviderDisplay({
  selectedModelId,
  className,
}: {
  selectedModelId: string;
  className?: string;
}) {
  // Extract model info and provider from the selectedModelId
  const { displayName, providerName } = useMemo(() => {
    if (!selectedModelId) {
      return { displayName: 'AI Model', providerName: '' };
    }
    
    // If the model ID is in provider:model format, extract both parts
    if (selectedModelId.includes(':')) {
      const [provider, model] = selectedModelId.split(':');
      return {
        displayName: model,
        providerName: provider.toLowerCase()
      };
    }
    
    // If it's a nickname, use it as is
    return {
      displayName: selectedModelId,
      providerName: selectedModelId
    };
  }, [selectedModelId]);
  
  // Provider color mapping for consistent styling
  const providerColors = useMemo(() => ({
    'openai': 'text-green-500',
    'anthropic': 'text-purple-500',
    'google': 'text-blue-500',
    'googleai': 'text-blue-500',
    'mistral': 'text-cyan-500',
    'meta': 'text-blue-600',
    'xai': 'text-black dark:text-white',
    'groq': 'text-orange-500',
    'cohere': 'text-indigo-500',
    'togetherai': 'text-purple-600',
    'together': 'text-purple-600',
    'fireworks': 'text-red-500',
    'perplexity': 'text-blue-400',
    'ai21': 'text-yellow-600',
    'azure': 'text-blue-700',
    'anyscale': 'text-pink-600',
    'deepinfra': 'text-teal-600',
    'replicate': 'text-gray-700 dark:text-gray-300',
    'deepseek': 'text-violet-600',
    'cerebras': 'text-amber-600',
    'ollama': 'text-emerald-600',
    'openrouter': 'text-fuchsia-600',
  }), []);
  
  // Provider display names
  const providerDisplayNames = useMemo(() => ({
    'openai': 'OpenAI',
    'anthropic': 'Anthropic',
    'google': 'Google',
    'googleai': 'Google',
    'mistral': 'Mistral',
    'meta': 'Meta',
    'xai': 'X.AI',
    'groq': 'Groq',
    'cohere': 'Cohere',
    'togetherai': 'Together',
    'together': 'Together',
    'fireworks': 'Fireworks',
    'perplexity': 'Perplexity',
    'ai21': 'AI21',
    'azure': 'Azure',
    'anyscale': 'Anyscale',
    'deepinfra': 'DeepInfra',
    'replicate': 'Replicate',
    'deepseek': 'DeepSeek',
    'cerebras': 'Cerebras',
    'ollama': 'Ollama',
    'openrouter': 'OpenRouter',
  }), []);
  
  return (
    <div
      className={cn(
        "p-1 h-7 min-w-7 rounded-full border border-input flex items-center justify-center overflow-hidden",
        className
      )}
      title={`${providerName.charAt(0).toUpperCase() + providerName.slice(1)} model: ${displayName}`}
    >
      <div className="flex items-center justify-center text-xs font-semibold px-1" style={{ fontSize: '9px' }}>
        <span className={Object.keys(providerColors).includes(providerName) ?
          providerColors[providerName as keyof typeof providerColors] :
          'text-gray-500'}>
          {Object.keys(providerDisplayNames).includes(providerName) ?
            providerDisplayNames[providerName as keyof typeof providerDisplayNames] :
            providerName}
        </span>
      </div>
    </div>
  );
}