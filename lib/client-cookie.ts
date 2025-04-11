'use client';

/**
 * Client-side cookie utilities
 *
 * These functions provide direct browser cookie manipulation
 * to ensure cookies are set immediately without relying on
 * server-side cookie handling.
 */


/**
 * Set a cookie in the browser
 * @param name Cookie name
 * @param value Cookie value
 * @param days Number of days until expiration
 */
export function setClientCookie(name: string, value: string, days: number = 30, options: { noRefresh?: boolean } = {}) {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      return;
    }
    
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `; expires=${date.toUTCString()}`;
    
    // Always use the direct document.cookie property which doesn't cause navigation
    // The noRefresh option is now redundant but kept for backward compatibility
    document.cookie = `${name}=${value}${expires}; path=/; SameSite=Strict`;
    
    // Store in localStorage as well for redundancy and to avoid any cookie-related issues
    try {
      localStorage.setItem(`cookie_${name}`, value);
      
      // Also store the timestamp of when this cookie was set
      localStorage.setItem(`cookie_${name}_timestamp`, Date.now().toString());
    } catch (e) {
      // Ignore localStorage errors
    }
    
    
    // Verify the cookie was set
    const allCookies = document.cookie;
    
    // Dispatch a custom event that components can listen for
    try {
      const event = new CustomEvent('cookieChange', {
        detail: { name, value, timestamp: Date.now() }
      });
      window.dispatchEvent(event);
    } catch (e) {
      // Ignore event dispatch errors
    }
  } catch (error) {
    // Ignore cookie setting errors
  }
}

/**
 * Get a cookie value from the browser
 * @param name Cookie name
 * @returns Cookie value or null if not found
 */
export function getClientCookie(name: string): string | null {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      return null;
    }
    
    // First try to get from document.cookie
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        const value = c.substring(nameEQ.length, c.length);
        return value;
      }
    }
    
    // If not found in document.cookie, try localStorage as fallback
    try {
      const localStorageValue = localStorage.getItem(`cookie_${name}`);
      if (localStorageValue) {
        
        // Sync back to document.cookie to ensure consistency
        setClientCookie(name, localStorageValue);
        
        return localStorageValue;
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return null;
  } catch (error) {
    // Ignore cookie retrieval errors
    return null;
  }
}

/**
 * Delete a cookie from the browser
 * @param name Cookie name
 */
export function deleteClientCookie(name: string) {
  try {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      return;
    }
    
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  } catch (error) {
    // Ignore cookie deletion errors
  }
}