/*
 * Created by Alan Helmick aka: crackerJack and Claude 3.7 via Roo
 * All rights applicable beyond open source reserved
 * Copyright Mira AI LLC 2025
 */

/**
 * User Preferences Hook
 * 
 * This module provides a React hook for managing user preferences across the application.
 * It handles loading, saving, and updating user preferences with persistence in localStorage.
 * 
 * Features:
 * - Persistent storage of user preferences across sessions
 * - Automatic reset of certain preferences on new day
 * - Support for theme preferences, model selections, and UI state
 * 
 * Usage:
 * ```tsx
 * const { preferences, isLoaded, setPreference, setPreferredModel, resetPreferences } = usePreferences();
 * 
 * // Access a preference
 * const theme = preferences.theme;
 * 
 * // Update a preference
 * setPreference('theme', 'dark');
 * 
 * // Set a preferred model for a category
 * setPreferredModel('chat', 'gpt-4');
 * 
 * // Reset all preferences
 * resetPreferences();
 * ```
 */

"use client"

import { useState, useEffect } from 'react'

/**
 * Type definition for model preferences mapping
 * Maps category names to selected model IDs
 */
type ModelPreferences = {
  [categoryName: string]: string; // categoryName -> modelId
}

/**
 * Complete user preferences structure
 * Contains all user-configurable settings and state
 */
type UserPreferences = {
  hasSeenIntro: boolean;        // Whether user has seen the intro screen
  lastSeenDate?: string;        // ISO date string of last session
  lastUserId?: string;          // User ID from previous session
  preferredModel?: string;      // Global preferred model (if applicable)
  theme?: 'light' | 'dark' | 'system'; // UI theme preference
  modelPreferences?: ModelPreferences; // Category-specific model selections
}

/**
 * Default preference values used for initialization and resets
 */
const defaultPreferences: UserPreferences = {
  hasSeenIntro: false,
  theme: 'system',
  modelPreferences: {}
}

/**
 * React hook for managing user preferences
 * Provides methods to access, update and reset user preferences
 * with persistence across sessions
 */
export function usePreferences() {
  // State for storing the current preferences
  const [preferences, setPreferencesState] = useState<UserPreferences>(defaultPreferences)
  // Track whether preferences have been loaded from storage
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Safely try to get user ID if session is available
  let currentUserId: string | undefined = undefined
  try {
    // Dynamically import useSession to prevent build errors
    // This makes the session usage optional and prevents errors when SessionProvider is not available
    if (typeof window !== 'undefined') {
      // Try to get session from localStorage
      const sessionData = localStorage.getItem('session')
      
      // Also check for authjs.session-token cookie which should contain the session
      const cookies = document.cookie.split(';').map(cookie => cookie.trim())
      const sessionCookie = cookies.find(cookie => cookie.startsWith('authjs.session-token='))
      
      // If we can't get the user ID from localStorage, generate a consistent device ID
      // This ensures theme preferences persist even without a user ID
      if (!sessionData) {
        // Try to get or create a device ID from localStorage
        let deviceId = localStorage.getItem('device_id')
        if (!deviceId) {
          // Generate a simple device ID and store it
          deviceId = 'device_' + Math.random().toString(36).substring(2, 15)
          localStorage.setItem('device_id', deviceId)
        } else {
          // Using existing device ID
        }
        currentUserId = deviceId
      } else {
        // Parse session from localStorage
        const session = JSON.parse(sessionData || '{}')
        currentUserId = session?.user?.id
      }
    }
  } catch (error) {
    // Session not available, continue without it
    console.error('Error getting session:', error)
  }

  // Load preferences from localStorage on component mount
  useEffect(() => {
    try {
      const storedPreferences = localStorage.getItem('userPreferences')
      
      if (storedPreferences) {
        const parsedPrefs = JSON.parse(storedPreferences)
        
        // Check if the stored date is from a different day
        if (parsedPrefs.lastSeenDate) {
          const today = new Date().toDateString()
          const lastSeen = new Date(parsedPrefs.lastSeenDate).toDateString()
          
          // Reset intro flag if it's a new day to show intro again
          if (today !== lastSeen) {
            parsedPrefs.hasSeenIntro = false
          }
        }
        
        // Ensure modelPreferences exists to prevent null reference errors
        if (!parsedPrefs.modelPreferences) {
          parsedPrefs.modelPreferences = {}
        }
        
        // Update state with loaded preferences
        setPreferencesState(parsedPrefs)
      } else {
        // No preferences found in localStorage
      }
    } catch (error) {
      console.error('Failed to load preferences from localStorage:', error)
    } finally {
      // Mark as loaded regardless of success/failure
      setIsLoaded(true)
    }
  }, []) // Only run once on mount

  // Reset preferences on user change (logout/login)
  useEffect(() => {
    // Check if preferences are loaded and user has changed
    if (isLoaded && currentUserId && preferences.lastUserId !== currentUserId) {
      // Reset intro flag for new user
      setPreference('hasSeenIntro', false)
      // Store the new user ID
      setPreference('lastUserId', currentUserId)
    }
  }, [currentUserId, isLoaded, preferences.lastUserId])

  /**
   * Update a specific preference value
   * @param key - The preference key to update
   * @param value - The new value to set
   */
  const setPreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferencesState(prev => {
      // Create new preferences object with updated value
      const newPreferences = { ...prev, [key]: value }
      
      // If setting hasSeenIntro to true, also update the lastSeenDate
      if (key === 'hasSeenIntro' && value === true) {
        newPreferences.lastSeenDate = new Date().toISOString()
      }
      
      // Save to localStorage
      try {
        localStorage.setItem('userPreferences', JSON.stringify(newPreferences))
      } catch (error) {
        console.error('Failed to save preferences to localStorage:', error)
      }
      
      return newPreferences
    })
  }

  /**
   * Set a preferred model for a specific category
   * @param categoryName - The category to set the model for (e.g., 'chat', 'image')
   * @param modelId - The ID of the selected model
   */
  const setPreferredModel = (categoryName: string, modelId: string) => {
    setPreferencesState(prev => {
      // Create new model preferences with updated category selection
      const newModelPreferences = {
        ...(prev.modelPreferences || {}),
        [categoryName]: modelId
      }
      
      // Update full preferences object
      const newPreferences = {
        ...prev,
        modelPreferences: newModelPreferences
      }
      
      // Save to localStorage
      try {
        localStorage.setItem('userPreferences', JSON.stringify(newPreferences))
      } catch (error) {
        console.error('Failed to save model preferences to localStorage:', error)
      }
      
      return newPreferences
    })
  }

  /**
   * Reset all preferences to default values
   */
  const resetPreferences = () => {
    // Set state back to defaults
    setPreferencesState(defaultPreferences)
    
    // Reset in localStorage
    try {
      localStorage.setItem('userPreferences', JSON.stringify(defaultPreferences))
    } catch (error) {
      console.error('Failed to reset preferences in localStorage', error)
    }
  }

  // Return the hook interface
  return {
    preferences,     // Current preference values
    isLoaded,        // Whether preferences have been loaded
    setPreference,   // Function to update a specific preference
    setPreferredModel, // Function to set a preferred model for a category
    resetPreferences // Function to reset all preferences
  }
}
