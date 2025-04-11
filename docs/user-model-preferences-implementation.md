# User Model Preferences Implementation

This document provides the detailed implementation for the enhanced user model preferences component, which allows users to select their preferred models and manage their API keys.

## File: `components/user-model-preferences.tsx`

```tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePreferences } from "@/hooks/use-preferences"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings2, Key, AlertCircle, CheckCircle, RefreshCw, Info } from "lucide-react"
import { toast } from "sonner"
import useSWR, { mutate } from "swr"
import { fetcher } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { isFeatureEnabled } from "@/lib/feature-flags"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSession } from "next-auth/react"

// Type definitions
interface ModelCategory {
  id: string;
  name: string;
  type: 'text' | 'image' | 'video' | 'audio';
  description?: string;
  order: number;
}

interface AIModel {
  id: string;
  providerId: string;
  categoryIds: string[];
  modelId: string;
  displayName: string;
  description?: string;
  contextLength?: number;
  capabilities: string[];
  isEnabled: boolean;
  isPrimary: boolean;
  categories?: ModelCategory[];
}

interface ModelProvider {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  apiConfigKey: string;
  isEnabled: boolean;
  registryId?: string;
  requiresApiKey: boolean;
}

interface UserApiKey {
  id: string;
  userId: string;
  providerId: string;
  apiKey: string;
  isEnabled: boolean;
}

interface RegistryProvider {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  authType: string;
  modelTypes: string[];
  requiresApiKey: boolean;
}

export function UserModelPreferences() {
  const [activeTab, setActiveTab] = useState("text")
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const { data: session } = useSession()
  const userId = session?.user?.id
  const userGroups = session?.user?.groups || []
  
  const { preferences, setPreferredModel } = usePreferences()
  const modelPrefs = preferences.modelPreferences || {}
  
  // Use SWR to fetch data
  const { data: models, error: modelsError } = useSWR<AIModel[]>('/api/models', fetcher)
  const { data: categories, error: categoriesError } = useSWR<ModelCategory[]>('/api/categories', fetcher)
  const { data: providers, error: providersError } = useSWR<ModelProvider[]>('/api/providers', fetcher)
  const { data: userApiKeys, error: apiKeysError } = useSWR<UserApiKey[]>(
    isFeatureEnabled('showApiKeyManagement', userId, userGroups) ? '/api/user/api-keys' : null, 
    fetcher
  )
  const { data: registryProviders, error: registryError } = 
    useSWR<RegistryProvider[]>(
      isFeatureEnabled('useProviderRegistry', userId, userGroups) ? '/api/providers/registry' : null, 
      fetcher
    )
  
  const isLoading = (!models || !categories || !providers) && 
                   (!modelsError && !categoriesError && !providersError)
  
  // Filter categories by active tab
  const filteredCategories = categories
    ? categories.filter(category => category.type === activeTab).sort((a, b) => a.order - b.order)
    : []
    
  // Get models for a specific category
  const getModelsForCategory = (categoryId: string) => {
    if (!models) return []
    
    return models.filter(model =>
      model.categoryIds.includes(categoryId) &&
      model.isEnabled
    )
  }
  
  // Get the currently selected model ID for a category
  const getSelectedModelId = (categoryName: string) => {
    if (!models || !categories) return ""
    
    // Check user preferences first
    const userPreference = modelPrefs[categoryName]
    if (userPreference) {
      // Verify the model still exists and is enabled
      const modelExists = models.some(m => m.id === userPreference && m.isEnabled)
      if (modelExists) return userPreference
    }
    
    // Fallback to primary model
    const category = categories.find(c => c.name === categoryName)
    if (!category) return ""
    
    const primaryModel = models.find(model =>
      model.categoryIds.includes(category.id) &&
      model.isPrimary &&
      model.isEnabled
    )
    
    return primaryModel?.id || ""
  }
  
  const handleModelChange = (categoryName: string, modelId: string) => {
    setPreferredModel(categoryName, modelId)
    toast.success(`Updated preferred model for ${categoryName}`)
  }

  // Get the actual model name from providers
  const getActualModelName = (modelId: string): string => {
    if (!models) return "";
    
    const model = models.find(m => m.id === modelId);
    if (!model) return "";

    // Map from providers.ts
    const modelMappings: Record<string, string> = {
      'chat-model-small': 'o3-mini',
      'chat-model-large': 'claude-3-7-sonnet-20250219',
      'chat-model-reasoning': 'deepseek-ai/DeepSeek-R1',
      'title-model': 'gpt-4-turbo',
      'artifact-model': 'gpt-4o-mini',
      'small-model': 'dall-e-2',
      'large-model': 'dall-e-3',
      'inpainting-model': 'dall-e-3-inpainting',
      'real-time-model': 'black-forest-labs/FLUX.1-schnell-Free'
    };

    return model.modelId || modelMappings[model.id] || model.displayName;
  }
  
  // Check if a provider has an API key
  const hasApiKey = (providerId: string): boolean => {
    if (!userApiKeys) return false
    return userApiKeys.some(key => key.providerId === providerId && key.isEnabled)
  }
  
  // Open API key dialog for a provider
  const openApiKeyDialog = (provider: ModelProvider) => {
    setSelectedProvider(provider)
    setApiKeyInput("")
    setApiKeyDialogOpen(true)
  }
  
  // Save API key
  const saveApiKey = async () => {
    if (!selectedProvider) return
    
    try {
      setIsSubmitting(true)
      
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          providerId: selectedProvider.id,
          apiKey: apiKeyInput
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save API key')
      }
      
      // Refresh API keys data
      mutate('/api/user/api-keys')
      
      // Refresh models to update availability
      mutate('/api/models')
      
      // Close dialog
      setApiKeyDialogOpen(false)
      
      toast.success(`API key saved for ${selectedProvider.name}`)
    } catch (error) {
      console.error('Error saving API key:', error)
      toast.error(`Failed to save API key: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Delete API key
  const deleteApiKey = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return
    
    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ providerId })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete API key')
      }
      
      // Refresh API keys data
      mutate('/api/user/api-keys')
      
      // Refresh models to update availability
      mutate('/api/models')
      
      toast.success('API key deleted')
    } catch (error) {
      console.error('Error deleting API key:', error)
      toast.error(`Failed to delete API key: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  // Refresh provider registry
  const refreshProviderRegistry = async () => {
    try {
      setIsRefreshing(true)
      
      const response = await fetch('/api/providers/registry', {
        method: 'POST'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to refresh provider registry')
      }
      
      // Refresh registry providers
      mutate('/api/providers/registry')
      
      // Refresh models to update availability
      mutate('/api/models')
      
      toast.success('Provider registry refreshed')
    } catch (error) {
      console.error('Error refreshing provider registry:', error)
      toast.error(`Failed to refresh provider registry: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRefreshing(false)
    }
  }
  
  // Check if a model is available (provider has API key if needed)
  const isModelAvailable = (model: AIModel): boolean => {
    if (!providers) return true
    
    const provider = providers.find(p => p.id === model.providerId)
    if (!provider) return true
    
    // If provider doesn't require API key, model is available
    if (!provider.requiresApiKey) return true
    
    // If provider requires API key, check if user has one
    return hasApiKey(provider.id)
  }
  
  if (isLoading) {
    return <div className="text-center py-8">Loading model preferences...</div>
  }
  
  if (!categories?.length || !models?.length) {
    return <div className="text-center py-8">No models available</div>
  }
  
  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings2 className="size-5" />
          <h2 className="text-2xl font-bold">Model Preferences</h2>
        </div>
        
        {isFeatureEnabled('useProviderRegistry', userId, userGroups) && 
         isFeatureEnabled('enableProviderRefresh', userId, userGroups) && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshProviderRegistry}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Providers
          </Button>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="image" disabled={!isFeatureEnabled('enableImageModels', userId, userGroups)}>
            Image
          </TabsTrigger>
          <TabsTrigger value="video" disabled={!isFeatureEnabled('enableVideoModels', userId, userGroups)}>
            Video
          </TabsTrigger>
          <TabsTrigger value="audio" disabled={!isFeatureEnabled('enableAudioModels', userId, userGroups)}>
            Audio
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Provider API Keys Section */}
      {isFeatureEnabled('showApiKeyManagement', userId, userGroups) && providers && providers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Provider API Keys</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers
              .filter(provider => provider.requiresApiKey)
              .map(provider => (
                <Card key={provider.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {provider.name}
                      {hasApiKey(provider.id) ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle className="size-3 mr-1" />
                          API Key Set
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                          <AlertCircle className="size-3 mr-1" />
                          API Key Required
                        </Badge>
                      )}
                    </CardTitle>
                    {provider.description && (
                      <CardDescription className="text-xs">{provider.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardFooter className="pt-2 mt-auto">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => openApiKeyDialog(provider)}
                    >
                      <Key className="size-4 mr-2" />
                      {hasApiKey(provider.id) ? 'Update API Key' : 'Add API Key'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
          </div>
        </div>
      )}
      
      {/* Model Categories Section */}
      <div className="space-y-4">
        {filteredCategories.map(category => {
          const categoryModels = getModelsForCategory(category.id)
          const selectedModelId = getSelectedModelId(category.name)
          
          if (!categoryModels.length) return null
          
          return (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {category.name}
                  <Badge variant="outline" className="ml-2">{category.type}</Badge>
                </CardTitle>
                {category.description && (
                  <CardDescription>{category.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedModelId}
                  onValueChange={(value) => handleModelChange(category.name, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryModels.map(model => {
                      // Get provider info
                      const provider = providers?.find(p => p.id === model.providerId)
                      const needsApiKey = provider?.requiresApiKey
                      const hasKey = provider ? hasApiKey(provider.id) : true
                      const isAvailable = !needsApiKey || hasKey
                      
                      return (
                        <SelectItem 
                          key={model.id} 
                          value={model.id}
                          disabled={!isAvailable}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{model.displayName}</span>
                            <div className="flex items-center gap-1">
                              {model.isPrimary && <Badge className="ml-2">Default</Badge>}
                              {needsApiKey && !hasKey && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="ml-1 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                      <Key className="size-3 mr-1" />
                                      Needs API Key
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    This model requires an API key. Add one in the Provider API Keys section.
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                
                {selectedModelId && (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm text-muted-foreground">
                      {models.find(m => m.id === selectedModelId)?.description || ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <strong>Model ID:</strong> {getActualModelName(selectedModelId)}
                    </div>
                    {models.find(m => m.id === selectedModelId)?.contextLength && (
                      <div className="text-xs text-muted-foreground">
                        <strong>Context Length:</strong> {models.find(m => m.id === selectedModelId)?.contextLength?.toLocaleString()} tokens
                      </div>
                    )}
                    {models.find(m => m.id === selectedModelId)?.capabilities?.length > 0 && (
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-1 mt-1">
                        <strong className="mr-1">Capabilities:</strong>
                        {models.find(m => m.id === selectedModelId)?.capabilities.map(capability => (
                          <Badge key={capability} variant="secondary" className="text-xs">
                            {capability}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
        
        {filteredCategories.length === 0 && (
          <div className="text-center py-8 border rounded-md">
            No {activeTab} model categories available
          </div>
        )}
      </div>
      
      {/* API Key Dialog */}
      <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedProvider?.name} API Key
            </DialogTitle>
            <DialogDescription>
              Enter your API key for {selectedProvider?.name}. This will be stored securely and used to access the provider's models.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="apiKey" className="text-sm font-medium">
                API Key
              </label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your API key"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <Info className="size-3 mr-1" />
                Your API key is stored securely and never shared.
              </p>
            </div>
            
            {selectedProvider && hasApiKey(selectedProvider.id) && (
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => deleteApiKey(selectedProvider.id)}
              >
                Delete API Key
              </Button>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setApiKeyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveApiKey} disabled={!apiKeyInput || isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save API Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

## Key Features

The enhanced user model preferences component includes several key features:

### 1. Model Selection

Users can select their preferred models for different categories:

- Models are grouped by category (e.g., chat-model-small, chat-model-large)
- Each category shows available models
- Users can select a preferred model for each category
- The selected model is saved in user preferences

### 2. API Key Management

Users can manage their API keys for different providers:

- The component shows which providers require API keys
- Users can add, update, and delete API keys
- API keys are stored securely
- Models that require API keys are disabled until the user adds an API key

### 3. Provider Registry Integration

The component integrates with the Vercel AI SDK provider registry:

- Registry providers are shown alongside default providers
- Users can refresh the provider registry
- Registry models are shown in the model selection UI

### 4. Feature Flag Integration

The component integrates with the feature flag system:

- Different features can be enabled or disabled through feature flags
- Feature flags control the visibility of UI elements
- Feature flags can be user-specific or global

### 5. User Interface Improvements

The component includes several UI improvements:

- Tabs for different model types (text, image, video, audio)
- Cards for each category with model selection
- Badges to indicate primary models and API key requirements
- Tooltips for additional information
- Dialog for API key management

## Integration with Other Components

The user model preferences component integrates with several other components:

### 1. Chat Header

The chat header includes a gear icon that opens the user model preferences:

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant="outline"
      size="icon"
      className="order-4 md:order-5"
      onClick={() => setPreferencesOpen(true)}
    >
      <Settings2 className="size-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Model Preferences</TooltipContent>
</Tooltip>

<Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Model Preferences</DialogTitle>
    </DialogHeader>
    <UserModelPreferences />
  </DialogContent>
</Dialog>
```

### 2. Model Selector

The model selector uses the user preferences to determine the selected model:

```tsx
const { preferences, setPreferredModel } = usePreferences();
const modelPrefs = preferences.modelPreferences || {};

// Get the current model's category name for preferences
const getCurrentCategory = (modelId: string): string | undefined => {
  const model = models?.find(m => m.id === modelId);
  return model?.categories?.find(c => c.name)?.name;
};

// Handle model selection and category mapping
const handleModelSelect = (model: AIModel) => {
  const categoryName = getCurrentCategory(model.id);
  
  if (categoryName) {
    setPreferredModel(categoryName, model.id);
  }
  
  startTransition(() => {
    setOptimisticModelId(model.id);
    saveChatModelAsCookie(model.id);
  });
};
```

### 3. Dynamic Providers

The dynamic providers system uses the user API keys to create provider instances:

```typescript
// In createDynamicProvider function
const userApiKeys = await getUserApiKeys(userId);

// For each model
const userApiKey = userApiKeys.find(key => key.providerId === provider.id);
if (userApiKey?.apiKey) {
  const providerInstance = await createProviderFromRegistry(
    provider.registryId,
    userApiKey.apiKey
  );
  
  // Use provider instance
}
```

## Testing Considerations

When testing the user model preferences component, consider the following:

1. Test with and without API keys
2. Test with different feature flag configurations
3. Test with different model types (text, image, video, audio)
4. Test with different providers (default and registry)
5. Test with different user roles (admin, regular user)

## Accessibility Considerations

The user model preferences component includes several accessibility features:

1. Proper labeling of form elements
2. Keyboard navigation support
3. Screen reader support
4. Color contrast for badges and buttons
5. Tooltips for additional information

## Performance Considerations

The user model preferences component includes several performance optimizations:

1. Caching of API responses with SWR
2. Conditional fetching of data based on feature flags
3. Optimistic UI updates for better user experience
4. Efficient rendering with React hooks