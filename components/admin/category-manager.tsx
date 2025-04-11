"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getKnownCategoryTypes } from "@/lib/db/model-management-types"

// Simple form for category management
export function CategoryManager() {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [customType, setCustomType] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Get known category types
  const knownTypes = getKnownCategoryTypes();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset status
    setMessage('');
    setError('');
    setIsLoading(true);
    
    try {
      const finalType = customType || type;
      
      if (!name || !finalType) {
        throw new Error('Name and type are required');
      }
      
      // Create the category using a simple POST request
      const response = await fetch('/api/registry/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          type: finalType,
          description,
          order: parseInt(order, 10) || 0,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create category');
      }
      
      // Reset form
      setName('');
      setType('');
      setDescription('');
      setOrder('0');
      setCustomType('');
      
      setMessage(`Category created successfully: ${name} (${finalType})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Category Manager</h2>
        <p className="text-sm text-muted-foreground">
          Create and manage model categories. Categories can be of any type, including custom types.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Category Name</Label>
          <Input
            id="name"
            placeholder="e.g., custom-model-large"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="type">Category Type</Label>
          <div className="flex gap-2">
            <select
              id="type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Select a type or enter custom below</option>
              {knownTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="customType">Custom Type (Optional)</Label>
          <Input
            id="customType"
            placeholder="e.g., custom-purpose"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Enter a custom type if it&apos;s not in the list above. This allows for user-defined model types.
          </p>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            placeholder="Description of this category"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="order">Display Order</Label>
          <Input
            id="order"
            type="number"
            placeholder="0"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          />
        </div>
        
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Category'}
        </Button>
        
        {message && (
          <div className="p-3 rounded-md bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-50">
            {message}
          </div>
        )}
        
        {error && (
          <div className="p-3 rounded-md bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-50">
            {error}
          </div>
        )}
      </form>
      
      <div className="mt-8">
        <h3 className="text-md font-medium">Known Category Types</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {knownTypes.map((t) => (
            <div key={t} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
              {t}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          These are the currently known category types in the system. You can add custom types using the form above.
        </p>
      </div>
    </div>
  );
}