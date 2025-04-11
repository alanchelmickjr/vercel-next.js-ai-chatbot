"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Settings2,
  Sparkles,
  Zap,
  Brain,
  Image as ImageIcon,
  Video,
  Music,
  Key,
  Info,
  CheckCircle2,
  Database,
  ListFilter,
  Server,
  Lock
} from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { fetcher } from "@/lib/utils"
import { registry as myProvider } from "@/lib/ai/provider-registry"
import { isFeatureEnabled } from "@/lib/feature-flags"

// Type definitions
interface ModelCategory {
  id: string;
  name: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'embedding';
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

interface Provider {
  id: string;
  name: string;
  requiresApiKey: boolean;
  apiKeyConfigured?: boolean;
}

export function UserModelPreferences() {
  const [activeTab, setActiveTab] = useState("categories")
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [sortColumn, setSortColumn] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [modelSortColumn, setModelSortColumn] = useState<string>("displayName")
  const [modelSortDirection, setModelSortDirection] = useState<"asc" | "desc">("asc")
  
  const { preferences, setPreferredModel } = usePreferences()
  const modelPrefs = preferences.modelPreferences || {}
  
  // Use SWR to fetch data from the registry API
  const { data: modelsData, error: modelsError } = useSWR<{models: AIModel[]}>('/api/registry?action=getModels', fetcher)
  const { data: categoriesData, error: categoriesError } = useSWR<{categories: ModelCategory[]}>('/api/registry?action=getCategories', fetcher)
  const { data: providersData } = useSWR<{providers: Provider[]}>('/api/registry?action=getProviders', fetcher)
  
  // Extract the data from the response
  const models = modelsData?.models || []
  const categories = categoriesData?.categories || []
  const providers = providersData?.providers || []
  
  const isLoading = (!models || !categories) && (!modelsError && !categoriesError)
  
  // Check if API key management is enabled
  const showApiKeyManagement = isFeatureEnabled('showApiKeyManagement', 'user-id')
  
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

  // Get the actual model name from the model object
  const getActualModelName = (modelId: string): string => {
    if (!models) return "";
    
    const model = models.find(m => m.id === modelId);
    if (!model) return "";

    // The API now returns the actual model name in displayName
    // But we'll keep the fallback logic just in case
    return model.displayName || model.modelId || model.id;
  }
  
  // Get provider name from ID
  const getProviderName = (providerId: string): string => {
    if (!providers) return providerId;
    const provider = providers.find((p: any) => p.id === providerId);
    return provider ? provider.name : providerId;
  };
  
  // Check if API key is available for a provider
  const isApiKeyAvailable = (providerId: string): boolean => {
    if (!providers) return false;
    const provider = providers.find(p => p.id === providerId);
    return provider ? (provider.apiKeyConfigured || !provider.requiresApiKey) : false;
  };
  
  // Get icon for model type
  const getModelTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <Sparkles className="size-5 text-blue-500" />;
      case 'embedding':
        return <Database className="size-5 text-blue-500" />;
      case 'image':
        return <ImageIcon className="size-5 text-purple-500" />;
      case 'video':
        return <Video className="size-5 text-red-500" />;
      case 'audio':
        return <Music className="size-5 text-green-500" />;
      default:
        return <Sparkles className="size-5 text-blue-500" />;
    }
  };
  
  // Get icon for model category
  const getCategoryIcon = (categoryName: string) => {
    if (categoryName.toLowerCase().includes('reasoning')) {
      return <Brain className="size-5 text-amber-500" />;
    } else if (categoryName.toLowerCase().includes('fast')) {
      return <Zap className="size-5 text-yellow-500" />;
    } else {
      return <Sparkles className="size-5 text-blue-500" />;
    }
  };
  
  // Sort categories for the tabular view
  const sortedCategories = categories ? [...categories].sort((a, b) => {
    let aValue: any = a[sortColumn as keyof ModelCategory];
    let bValue: any = b[sortColumn as keyof ModelCategory];
    
    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    // Default comparison
    return sortDirection === 'asc'
      ? (aValue > bValue ? 1 : -1)
      : (bValue > aValue ? 1 : -1);
  }) : [];
  
  // Sort models for the models tab
  const sortedModels = models ? [...models].sort((a, b) => {
    let aValue: any = a[modelSortColumn as keyof AIModel];
    let bValue: any = b[modelSortColumn as keyof AIModel];
    
    // Handle special cases
    if (modelSortColumn === 'provider') {
      aValue = getProviderName(a.providerId);
      bValue = getProviderName(b.providerId);
    } else if (modelSortColumn === 'categories') {
      aValue = a.categoryIds.length;
      bValue = b.categoryIds.length;
    } else if (modelSortColumn === 'apiKeyAvailable') {
      aValue = isApiKeyAvailable(a.providerId);
      bValue = isApiKeyAvailable(b.providerId);
    }
    
    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return modelSortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    // Handle boolean comparison
    if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      return modelSortDirection === 'asc'
        ? (aValue ? 1 : 0) - (bValue ? 1 : 0)
        : (bValue ? 1 : 0) - (aValue ? 1 : 0);
    }
    
    // Default comparison
    return modelSortDirection === 'asc'
      ? (aValue > bValue ? 1 : -1)
      : (bValue > aValue ? 1 : -1);
  }) : [];
  
  // Get all available providers
  // TODO: Find a way to NOT hard code this in the future
  const availableProviders = [
    { id: 'openai', name: 'OpenAI', requiresApiKey: true },
    { id: 'anthropic', name: 'Anthropic', requiresApiKey: true },
    { id: 'mistral', name: 'Mistral AI', requiresApiKey: true },
    { id: 'groq', name: 'Groq', requiresApiKey: true },
    { id: 'together', name: 'Together AI', requiresApiKey: true },
    { id: 'openrouter', name: 'OpenRouter', requiresApiKey: true },
    { id: 'ollama', name: 'Ollama', requiresApiKey: false },
    { id: 'cohere', name: 'Cohere', requiresApiKey: true },
    { id: 'perplexity', name: 'Perplexity AI', requiresApiKey: true },
    { id: 'deepseek', name: 'DeepSeek AI', requiresApiKey: true },
    { id: 'google', name: 'Google AI', requiresApiKey: true },
    { id: 'replicate', name: 'Replicate', requiresApiKey: true },
    { id: 'stability', name: 'Stability AI', requiresApiKey: true }
  ];
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full size-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading model preferences...</p>
        </div>
      </div>
    );
  }
  
  if (!categories?.length || !models?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Info className="size-12 text-muted-foreground mb-4" />
        <p className="text-lg">No models available</p>
        <p className="text-sm text-muted-foreground mt-2">Please check your configuration or try again later.</p>
      </div>
    );
  }
  
  return (
    <div className="size-full max-h-screen max-w-full mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings2 className="size-6 text-primary" />
          <h2 className="text-2xl font-bold">Model Preferences</h2>
        </div>
      </div>
      
      <div className="h-[calc(100vh-6rem)] flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="flex flex-wrap w-full">
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <ListFilter className="size-4" />
              <span>Categories</span>
            </TabsTrigger>
            <TabsTrigger value="models" className="flex items-center gap-2">
              <Server className="size-4" />
              <span>All Models</span>
            </TabsTrigger>
            <TabsTrigger value="keys" className="flex items-center gap-2">
              <Key className="size-4" />
              <span>API Keys</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Categories Tab */}
          <TabsContent value="categories" className="mt-0 flex-1">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Model Categories</CardTitle>
                <CardDescription>
                  View and configure model categories and their default models.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left font-medium cursor-pointer" onClick={() => {
                          if (sortColumn === "name") {
                            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                          } else {
                            setSortColumn("name");
                            setSortDirection("asc");
                          }
                        }}>
                          Category Name {sortColumn === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th className="px-4 py-2 text-left font-medium cursor-pointer" onClick={() => {
                          if (sortColumn === "type") {
                            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                          } else {
                            setSortColumn("type");
                            setSortDirection("asc");
                          }
                        }}>
                          Type {sortColumn === "type" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th className="px-4 py-2 text-left font-medium">Default Model</th>
                        <th className="px-4 py-2 text-left font-medium">Selected Model</th>
                        <th className="px-4 py-2 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCategories.map(category => {
                        const selectedModelId = getSelectedModelId(category.name);
                        const categoryModels = getModelsForCategory(category.id);
                        const defaultModel = categoryModels.find(m => m.isPrimary);
                        const selectedModel = categoryModels.find(m => m.id === selectedModelId);
                        
                        return (
                          <tr key={category.id} className="border-b hover:bg-muted/20">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {getCategoryIcon(category.name)}
                                <div className="font-medium">{category.name}</div>
                              </div>
                              {category.description && (
                                <div className="text-xs text-muted-foreground mt-1">{category.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {getModelTypeIcon(category.type)}
                                <span className="capitalize">{category.type}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {defaultModel ? (
                                <div>
                                  <div className="font-medium">{defaultModel.displayName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {getProviderName(defaultModel.providerId)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">None</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {selectedModel ? (
                                <div>
                                  <div className="font-medium">{selectedModel.displayName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {getProviderName(selectedModel.providerId)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Default</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                  >
                                    Configure
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Edit Model Preference</DialogTitle>
                                    <DialogDescription>
                                      Configure your preferred model for the {category.name} category.
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="flex flex-col space-y-2">
                                        <Label htmlFor="displayName">Model Name *</Label>
                                        <Input
                                          id="displayName"
                                          value={selectedModelId ? models.find(m => m.id === selectedModelId)?.displayName : ""}
                                          onChange={(e) => {
                                            // Find the model and update its display name
                                            const model = models.find(m => m.id === selectedModelId);
                                            if (model) {
                                              // This is just for UI display, not actually changing the model
                                              const updatedModel = {...model, displayName: e.target.value};
                                              // We would need a way to save this preference
                                            }
                                          }}
                                          placeholder="Custom display name"
                                        />
                                      </div>
                                      
                                      <div className="flex flex-col space-y-2">
                                        <Label htmlFor="modelId">Internal Model ID *</Label>
                                        <Select
                                          value={selectedModelId}
                                          onValueChange={(value) => handleModelChange(category.name, value)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a model" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {categoryModels
                                              .filter(model => {
                                                // If a provider is selected, filter by that provider
                                                const selectedProvider = selectedModelId ?
                                                  models.find(m => m.id === selectedModelId)?.providerId : null;
                                                
                                                return selectedProvider ?
                                                  model.providerId === selectedProvider : true;
                                              })
                                              .map(model => (
                                                <SelectItem key={model.id} value={model.id}>
                                                  {model.displayName} ({model.modelId})
                                                </SelectItem>
                                              ))
                                            }
                                          </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">The actual model identifier used by the provider</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-col space-y-2">
                                      <Label htmlFor="provider">Provider *</Label>
                                      <Select
                                        value={selectedModelId ? models.find(m => m.id === selectedModelId)?.providerId : ""}
                                        onValueChange={(providerId) => {
                                          // When provider changes, filter models by this provider and category
                                          const providerModels = models.filter(m =>
                                            m.providerId === providerId &&
                                            m.categoryIds.includes(category.id) &&
                                            m.isEnabled
                                          );
                                          
                                          // If there are models for this provider and category, select the first one
                                          if (providerModels.length > 0) {
                                            handleModelChange(category.name, providerModels[0].id);
                                          }
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availableProviders.map(provider => (
                                            <SelectItem key={provider.id} value={provider.id}>
                                              {provider.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    <div className="flex flex-col space-y-2">
                                      <Label>Categories *</Label>
                                      <div className="grid grid-cols-2 gap-2">
                                        {categories.map((cat) => (
                                          <div key={cat.id} className="flex items-center space-x-2">
                                            <input
                                              type="checkbox"
                                              id={`category-${cat.id}`}
                                              checked={cat.id === category.id || (selectedModelId ? models.find(m => m.id === selectedModelId)?.categoryIds?.includes(cat.id) || false : false)}
                                              onChange={(e) => {
                                                // Allow selecting additional categories, but ensure the current one stays selected
                                                if (cat.id === category.id) return; // Can't uncheck the current category
                                                
                                                // This is just UI, not actually changing the model's categories
                                                // We would need a way to save this preference
                                              }}
                                            />
                                            <label htmlFor={`category-${cat.id}`}>{cat.name}</label>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="flex flex-col space-y-2">
                                        <Label htmlFor="contextLength">Context Length</Label>
                                        <Input
                                          id="contextLength"
                                          type="number"
                                          value={selectedModelId ? models.find(m => m.id === selectedModelId)?.contextLength || "" : ""}
                                          onChange={(e) => {
                                            // This is just UI, not actually changing the model
                                          }}
                                          placeholder="128000"
                                        />
                                      </div>
                                      
                                      <div className="flex flex-col space-y-2">
                                        <Label htmlFor="capabilities">Capabilities</Label>
                                        <Input
                                          id="capabilities"
                                          value={selectedModelId ? (models.find(m => m.id === selectedModelId)?.capabilities || []).join(", ") : ""}
                                          onChange={(e) => {
                                            // This is just UI, not actually changing the model
                                          }}
                                          placeholder="text, code, vision"
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-col space-y-2">
                                      <Label htmlFor="description">Description</Label>
                                      <Input
                                        id="description"
                                        value={selectedModelId ? models.find(m => m.id === selectedModelId)?.description || "" : ""}
                                        onChange={(e) => {
                                          // This is just UI, not actually changing the model
                                        }}
                                        placeholder="A brief description of the model and its capabilities"
                                      />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="flex items-center space-x-2">
                                        <Switch
                                          checked={selectedModelId ? models.find(m => m.id === selectedModelId)?.isEnabled ?? true : true}
                                          onCheckedChange={(checked: boolean) => {
                                            // This is just UI, not actually changing the model
                                          }}
                                          disabled
                                        />
                                        <Label>Enabled</Label>
                                      </div>
                                      
                                      <div className="flex items-center space-x-2">
                                        <Switch
                                          checked={selectedModelId ? models.find(m => m.id === selectedModelId)?.isPrimary ?? false : false}
                                          onCheckedChange={(checked: boolean) => {
                                            // This is just UI, not actually changing the model
                                          }}
                                          disabled
                                        />
                                        <Label>Primary for Categories</Label>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <DialogFooter>
                                    <Button variant="outline" type="button" onClick={(e) => {
                                      // Find the closest dialog element and close it
                                      const dialog = (e.target as HTMLElement).closest('dialog');
                                      if (dialog) {
                                        (dialog as any).close();
                                      }
                                    }}>
                                      Cancel
                                    </Button>
                                    <Button onClick={() => {
                                      // The model change is already handled by the Select's onValueChange
                                      toast.success(`Updated preferred model for ${category.name}`);
                                      
                                      // Find the closest dialog element and close it
                                      const dialog = document.querySelector('[role="dialog"]');
                                      if (dialog) {
                                        (dialog as any).close();
                                      }
                                    }}>
                                      Save Changes
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* All Models Tab */}
          <TabsContent value="models" className="mt-0 flex-1">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>All Available Models</CardTitle>
                <CardDescription>
                  View all available AI models from the provider registry.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left font-medium cursor-pointer" onClick={() => {
                          if (modelSortColumn === "displayName") {
                            setModelSortDirection(modelSortDirection === "asc" ? "desc" : "asc");
                          } else {
                            setModelSortColumn("displayName");
                            setModelSortDirection("asc");
                          }
                        }}>
                          Model {modelSortColumn === "displayName" && (modelSortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th className="px-4 py-2 text-left font-medium cursor-pointer" onClick={() => {
                          if (modelSortColumn === "modelId") {
                            setModelSortDirection(modelSortDirection === "asc" ? "desc" : "asc");
                          } else {
                            setModelSortColumn("modelId");
                            setModelSortDirection("asc");
                          }
                        }}>
                          Internal ID {modelSortColumn === "modelId" && (modelSortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th className="px-4 py-2 text-left font-medium cursor-pointer" onClick={() => {
                          if (modelSortColumn === "apiKeyAvailable") {
                            setModelSortDirection(modelSortDirection === "asc" ? "desc" : "asc");
                          } else {
                            setModelSortColumn("apiKeyAvailable");
                            setModelSortDirection("asc");
                          }
                        }}>
                          API Key {modelSortColumn === "apiKeyAvailable" && (modelSortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th className="px-4 py-2 text-left font-medium cursor-pointer" onClick={() => {
                          if (modelSortColumn === "isEnabled") {
                            setModelSortDirection(modelSortDirection === "asc" ? "desc" : "asc");
                          } else {
                            setModelSortColumn("isEnabled");
                            setModelSortDirection("asc");
                          }
                        }}>
                          Status {modelSortColumn === "isEnabled" && (modelSortDirection === "asc" ? "↑" : "↓")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Always show all available models */}
                      {sortedModels.map(model => {
                          const isSelected = Object.values(modelPrefs).includes(model.id);
                          
                          return (
                            <tr key={model.id} className="border-b hover:bg-muted/20">
                              <td className="px-4 py-3">
                                <div className="font-medium">{getActualModelName(model.id)}</div>
                                {model.description && (
                                  <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                                    {model.description}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <code className="bg-muted px-1 py-0.5 rounded text-xs">{model.id}</code>
                              </td>
                              <td className="px-4 py-3">
                                {isApiKeyAvailable(model.providerId) ? (
                                  <Badge className="bg-green-600">
                                    <CheckCircle2 className="size-3 mr-1" />
                                    Available
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-amber-500 border-amber-500">
                                    <Key className="size-3 mr-1" />
                                    Required
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {model.isEnabled ? (
                                  <Badge className="bg-green-600">
                                    <CheckCircle2 className="size-3 mr-1" />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Disabled</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* We've removed the text, embedding, image, video, and audio tabs as requested */}
          
          {/* API Keys Tab */}
          <TabsContent value="keys" className="mt-0 flex-1">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="size-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Add your API keys to use models from different providers. Your keys are stored securely.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                <div className="space-y-6">
                  {availableProviders.filter(p => p.requiresApiKey).map(provider => (
                    <div key={provider.id} className="border-b pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium">{provider.name}</h3>
                        <Badge variant={isApiKeyAvailable(provider.id) ? "default" : "outline"}>
                          {isApiKeyAvailable(provider.id) ? "Configured" : "Not Configured"}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <Input 
                          type="password" 
                          placeholder={`${provider.name} API Key`} 
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                          Required for {provider.name} models
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-end pt-4">
                    <Button>
                      Save API Keys
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Helper function to get color for category
function getCategoryColor(categoryName: string): string {
  const name = categoryName.toLowerCase();
  if (name.includes('reasoning')) return '#f59e0b'; // amber-500
  if (name.includes('fast')) return '#eab308'; // yellow-500
  if (name.includes('large')) return '#3b82f6'; // blue-500
  if (name.includes('small')) return '#10b981'; // emerald-500
  if (name.includes('embed')) return '#0ea5e9'; // sky-500
  return '#6366f1'; // indigo-500
}
