/*
 * Created by Alan Helmick aka: crackerJack and Claude 3.7 via Roo
 * All rights applicable beyond open source reserved
 * Copyright Mira AI LLC 2025
 */

/**
 * Weather API Tool
 * 
 * This module provides a tool for fetching current weather data from the Open-Meteo API.
 * It allows the application to retrieve weather information for a specific geographic location
 * specified by latitude and longitude coordinates.
 * 
 * Features:
 * - Fetches current temperature data
 * - Retrieves hourly temperature forecasts
 * - Gets daily sunrise and sunset times
 * - Handles API errors gracefully with fallback data
 * 
 * Usage:
 * ```typescript
 * import { getWeather } from '@/lib/ai/tools/get-weather';
 * 
 * // Execute the tool with latitude and longitude
 * const weatherData = await getWeather.execute({
 *   latitude: 37.7749,
 *   longitude: -122.4194
 * });
 * 
 * // Access the weather data
 * const currentTemp = weatherData.current.temperature_2m;
 * ```
 */

import { z } from 'zod';
import { tool } from '@/lib/tools/tool-wrapper';

/**
 * Weather API tool definition
 * 
 * Uses the Open-Meteo API to fetch weather data for a specific location.
 * The API is free to use and does not require authentication.
 */
export const getWeather = tool({
  // Human-readable description of the tool's purpose
  description: 'Get the current weather at a location',
  
  // Parameter validation schema using Zod
  parameters: z.object({
    latitude: z.number(),  // Geographic latitude (-90 to 90)
    longitude: z.number(), // Geographic longitude (-180 to 180)
  }),
  
  /**
   * Execute function that performs the actual API request
   * 
   * @param latitude - The latitude coordinate of the location
   * @param longitude - The longitude coordinate of the location
   * @returns Weather data object or error object with fallback data
   */
  execute: async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
    // Log the request parameters for debugging
    console.log(`[Weather API] Requesting weather data for lat:${latitude}, lon:${longitude}`);
    
    try {
      // Construct the API URL with query parameters
      // - current=temperature_2m: Get current temperature
      // - hourly=temperature_2m: Get hourly temperature forecast
      // - daily=sunrise,sunset: Get daily sunrise and sunset times
      // - timezone=auto: Use the timezone of the requested location
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`;
      console.log(`[Weather API] Request URL: ${url}`);
      
      // Perform the API request
      const response = await fetch(url);
      console.log(`[Weather API] Response status: ${response.status}`);
      
      // Check the content type to ensure we received JSON
      const contentType = response.headers.get('content-type');
      console.log(`[Weather API] Content-Type: ${contentType}`);
      
      // If not JSON, log the text response to see what's being returned
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error(`[Weather API] Non-JSON response received: ${textResponse.substring(0, 200)}...`);
        throw new Error(`Expected JSON but received ${contentType || 'unknown content type'}`);
      }
      
      // Parse the JSON response
      const weatherData = await response.json();
      console.log(`[Weather API] Successfully parsed JSON response`);
      return weatherData;
    } catch (error: any) {
      // Log the error for debugging
      console.error(`[Weather API] Error fetching weather data:`, error);
      
      // Return an error object with fallback data structure
      // This prevents UI errors by ensuring the expected data shape is maintained
      return {
        error: `Failed to fetch weather data: ${error?.message || 'Unknown error'}`,
        // Include minimal structure to prevent UI errors
        current: { temperature_2m: 0, time: new Date().toISOString() },
        current_units: { temperature_2m: '°C' },
        hourly: { time: [], temperature_2m: [] },
        daily: { time: [], sunrise: [], sunset: [] }
      };
    }
  },
});
