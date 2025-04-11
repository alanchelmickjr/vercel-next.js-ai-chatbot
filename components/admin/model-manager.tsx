"use client"

import { useState, useEffect } from "react"
import { CategoryManager } from "./category-manager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { PlusIcon, Pencil, Trash2, CheckCircle, Database, Loader2 } from "lucide-react"
import {
  AIModel,
  ModelProvider,
  ModelCategory,
} from "@/lib/db/model-management-types"

// Refresh model cache function
const refreshModelCache = async () => {
  console.log('[model-manager] Refreshing model cache');
  // Use the registry API to refresh the cache
  const response = await fetch('/api/registry?action=refreshCache');
  
  if (!response.ok) {
    throw new Error(`Failed to refresh cache: ${response.statusText}`);
  }
  
  return response.json();
};

export function ModelManager() {
  const [activeTab, setActiveTab] = useState("text")
  const [models, setModels] = useState<AIModel[]>([])
  const [providers, setProviders] = useState<ModelProvider[]>([])
  const [categories, setCategories] = useState<ModelCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingModel, setEditingModel] = useState<AIModel | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Partial<AIModel>>({
    displayName: "",
    modelId: "",
    providerId: "",
    categoryIds: [],
    isEnabled: true,
    isPrimary: false,
    capabilities: [],
    contextLength: undefined
  })

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Use the new registry API endpoint to get all data at once
      const response = await fetch('/api/registry?action=getAll');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch registry data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Set the data from the API response
      setModels(data.models)
      setProviders(data.providers)
      setCategories(data.categories)
      
      console.log('Loaded model data from registry API')
    } catch (error) {
      console.error("Failed to load model data", error)
      toast.error("Failed to load models")
      
      // Fallback to default data if API fails
      try {
        const { DEFAULT_MODELS, DEFAULT_PROVIDERS, DEFAULT_CATEGORIES } = await import('@/lib/db/model-management-types')
        setModels(DEFAULT_MODELS)
        setProviders(DEFAULT_PROVIDERS)
        setCategories(DEFAULT_CATEGORIES)
        console.log('Loaded fallback model data')
      } catch (fallbackError) {
        console.error("Failed to load fallback data", fallbackError)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Reset form when dialog closes
  useEffect(() => {
    if (!dialogOpen) {
      setFormData({
        displayName: "",
        modelId: "",
        providerId: "",
        categoryIds: [],
        isEnabled: true,
        isPrimary: false,
        capabilities: [],
        contextLength: undefined
      })
      setEditingModel(null)
    }
  }, [dialogOpen])

  // Filter models by type based on active tab
  const filteredModels = models.filter(model => {
    // Check if any of the model's categories match the active tab type
    if (model.categories && model.categories.length > 0) {
      return model.categories.some(cat => cat.type === activeTab);
    }
    
    // If no categories or no matching category, try to infer from capabilities
    if (model.capabilities) {
      if (activeTab === 'text' && model.capabilities.some(cap => ['text', 'chat', 'text-generation'].includes(cap))) {
        return true;
      }
      if (activeTab === 'embedding' && model.capabilities.some(cap => ['embedding', 'embeddings'].includes(cap))) {
        return true;
      }
      if (activeTab === 'title' && model.capabilities.some(cap => ['title', 'summarization'].includes(cap))) {
        return true;
      }
      if (activeTab === 'artifact' && model.capabilities.some(cap =>
        ['artifact', 'content-creation', 'content-generation', 'document', 'text-generation', 'code-generation'].includes(cap)
      )) {
        return true;
      }
      if (activeTab === 'image' && model.capabilities.some(cap => ['image', 'image-generation'].includes(cap))) {
        return true;
      }
      if (activeTab === 'video' && model.capabilities.some(cap => ['video', 'video-generation'].includes(cap))) {
        return true;
      }
      if (activeTab === 'audio' && model.capabilities.some(cap => ['audio', 'transcription'].includes(cap))) {
        return true;
      }
    }
    
    // Default to text if we can't determine the type
    return false;
  })
  
  // Filter categories by type based on active tab
  const filteredCategories = categories.filter(cat => cat.type === activeTab)

  const handleSubmit = async () => {
    try {
      if (!formData.displayName || !formData.modelId || !formData.providerId || formData.categoryIds?.length === 0) {
        toast.error("Please fill all required fields")
        return
      }

      setIsSaving(true)

      // Update local state directly
      if (editingModel) {
        // Update existing model in local state
        const updatedModels = models.map(model =>
          model.id === editingModel.id ? { ...model, ...formData, updatedAt: new Date() } : model
        );
        setModels(updatedModels);
        toast.success("Model updated successfully")
      } else {
        // Create new model in local state
        const newModel: AIModel = {
          id: `model-${Date.now()}`,
          ...formData as Omit<AIModel, 'id' | 'createdAt' | 'updatedAt'>,
          createdAt: new Date(),
          updatedAt: new Date()
        } as AIModel;
        
        setModels([...models, newModel]);
        toast.success("Model added successfully")
      }
      
      // Refresh cache
      await refreshModelCache()
      
      setDialogOpen(false)
    } catch (error) {
      console.error("Error saving model:", error)
      toast.error("Failed to save model")
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditModel = (model: AIModel) => {
    setEditingModel(model)
    setFormData({
      displayName: model.displayName,
      modelId: model.modelId,
      providerId: model.providerId,
      categoryIds: model.categoryIds,
      isEnabled: model.isEnabled,
      isPrimary: model.isPrimary,
      capabilities: model.capabilities,
      contextLength: model.contextLength,
      description: model.description
    })
    setDialogOpen(true)
  }

  const handleDeleteModel = async (modelId: string) => {
    if (confirm("Are you sure you want to delete this model?")) {
      try {
        // Delete model from local state
        const updatedModels = models.filter(model => model.id !== modelId);
        setModels(updatedModels);
        
        // Refresh cache
        await refreshModelCache()
        
        toast.success("Model deleted successfully")
      } catch (error) {
        console.error("Error deleting model:", error)
        toast.error("Failed to delete model")
      }
    }
  }

  const toggleModelEnabled = async (model: AIModel) => {
    try {
      // Update model in local state
      const updatedModels = models.map(m =>
        m.id === model.id ? { ...m, isEnabled: !m.isEnabled, updatedAt: new Date() } : m
      );
      setModels(updatedModels);
      
      // Refresh cache
      await refreshModelCache()
      
      toast.success(`Model ${model.isEnabled ? "disabled" : "enabled"}`)
    } catch (error) {
      console.error("Error toggling model:", error)
      toast.error("Failed to update model")
    }
  }

  const toggleModelPrimary = async (model: AIModel) => {
    try {
      let updatedModels = [...models];
      
      // If making a model primary, disable primary for other models in the same categories
      if (!model.isPrimary) {
        updatedModels = updatedModels.map(m => {
          // If this model is in any of the same categories as the target model
          // and it's currently primary, set it to not primary
          if (m.id !== model.id && m.isPrimary &&
              m.categoryIds.some(catId => model.categoryIds.includes(catId))) {
            return { ...m, isPrimary: false, updatedAt: new Date() };
          }
          return m;
        });
      }
      
      // Update this model's primary status
      updatedModels = updatedModels.map(m =>
        m.id === model.id ? { ...m, isPrimary: !m.isPrimary, updatedAt: new Date() } : m
      );
      
      // Update state
      setModels(updatedModels);
      
      // Refresh cache
      await refreshModelCache()
      
      toast.success(`Model set as ${model.isPrimary ? "backup" : "primary"}`)
    } catch (error) {
      console.error("Error updating model:", error)
      toast.error("Failed to update model")
    }
  }

  const refreshCache = async () => {
    setIsRefreshing(true)
    try {
      // Use the registry API to refresh the cache
      const response = await fetch('/api/registry?action=refreshCache');
      
      if (!response.ok) {
        throw new Error(`Failed to refresh cache: ${response.statusText}`);
      }
      
      // Reload the data after refreshing the cache
      await loadData()
      
      toast.success("Model cache refreshed")
    } catch (error) {
      console.error("Error refreshing cache:", error)
      toast.error("Failed to refresh model cache")
    } finally {
      setIsRefreshing(false)
    }
  }

  const getProviderName = (providerId: string) => {
    return providers.find(p => p.id === providerId)?.name || "Unknown"
  }

  const getCategoryNames = (categoryIds: string[]) => {
    return categories
      .filter(c => categoryIds.includes(c.id))
      .map(c => c.name)
      .join(", ")
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">AI Model Management</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={refreshCache} 
            disabled={isRefreshing}
          >
            {isRefreshing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Database className="mr-2 size-4" />}
            Refresh Cache
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 size-4" />
                Add Model
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingModel ? "Edit Model" : "Add New Model"}</DialogTitle>
                <DialogDescription>
                  Configure the model details and assign it to categories.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="displayName">Model Name *</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName || ""}
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      placeholder="gpt-4o-mini"
                    />
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="modelId">Internal Model ID *</Label>
                    <Input
                      id="modelId"
                      value={formData.modelId || ""}
                      onChange={(e) => setFormData({...formData, modelId: e.target.value})}
                      placeholder="gpt-4o-mini"
                    />
                    <p className="text-xs text-muted-foreground mt-1">The actual model identifier used by the provider</p>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="provider">Provider *</Label>
                  <Select 
                    value={formData.providerId || ""} 
                    onValueChange={(value) => setFormData({...formData, providerId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider) => (
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
                    {filteredCategories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`category-${category.id}`}
                          checked={(formData.categoryIds || []).includes(category.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData, 
                                categoryIds: [...(formData.categoryIds || []), category.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                categoryIds: (formData.categoryIds || []).filter(id => id !== category.id)
                              });
                            }
                          }}
                        />
                        <label htmlFor={`category-${category.id}`}>{category.name}</label>
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
                      value={formData.contextLength || ""}
                      onChange={(e) => setFormData({...formData, contextLength: parseInt(e.target.value) || undefined})}
                      placeholder="128000"
                    />
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="capabilities">Capabilities</Label>
                    <Input
                      id="capabilities"
                      value={(formData.capabilities || []).join(", ")}
                      onChange={(e) => setFormData({
                        ...formData, 
                        capabilities: e.target.value.split(",").map(c => c.trim()).filter(Boolean)
                      })}
                      placeholder="text, code, vision"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="A brief description of the model and its capabilities"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.isEnabled ?? true}
                      onCheckedChange={(checked: boolean) => setFormData({...formData, isEnabled: checked})}
                    />
                    <Label>Enabled</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.isPrimary ?? false}
                      onCheckedChange={(checked: boolean) => setFormData({...formData, isPrimary: checked})}
                    />
                    <Label>Primary for Categories</Label>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="text">Text Models</TabsTrigger>
          <TabsTrigger value="embedding">Embedding Models</TabsTrigger>
          <TabsTrigger value="title">Title Models</TabsTrigger>
          <TabsTrigger value="artifact">Artifact Models</TabsTrigger>
          <TabsTrigger value="image">Image Models</TabsTrigger>
          <TabsTrigger value="video">Video Models</TabsTrigger>
          <TabsTrigger value="audio">Audio Models</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {activeTab === 'categories' ? (
        <div className="mt-4">
          <CategoryManager />
        </div>
      ) : isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="size-8 animate-spin mx-auto" />
          <p className="mt-2">Loading models...</p>
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="text-center py-8 border rounded-md bg-muted/20">
          <p>No {activeTab} models found. Click Add Model to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModels.map((model) => (
            <Card key={model.id} className={!model.isEnabled ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      {model.displayName} {/* This now shows the actual model name */}
                      {model.isPrimary && (
                        <Badge className="ml-2 bg-green-600">Primary</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {getProviderName(model.providerId)} · <span className="text-muted-foreground">Model ID: {model.modelId}</span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="size-8 p-0"
                      onClick={() => handleEditModel(model)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteModel(model.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {model.description && (
                    <p className="text-muted-foreground">{model.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    {model.capabilities?.map(capability => (
                      <Badge key={capability} variant="outline">{capability}</Badge>
                    ))}
                  </div>
                  
                  <div className="mt-2">
                    <span className="text-muted-foreground">Categories:</span>
                    <p>{getCategoryNames(model.categoryIds)}</p>
                  </div>
                  
                  {model.contextLength && (
                    <div>
                      <span className="text-muted-foreground">Context:</span>
                      <span className="ml-1">
                        {new Intl.NumberFormat().format(model.contextLength)} tokens
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={model.isEnabled}
                    onCheckedChange={() => toggleModelEnabled(model)}
                    aria-label={model.isEnabled ? "Disable model" : "Enable model"}
                  />
                  <span className="text-sm">{model.isEnabled ? "Enabled" : "Disabled"}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleModelPrimary(model)}
                  disabled={model.isPrimary}
                >
                  {model.isPrimary ? (
                    <>
                      <CheckCircle className="mr-1 size-4" />
                      Primary
                    </>
                  ) : (
                    "Set as Primary"
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
