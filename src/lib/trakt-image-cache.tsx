"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Image data structure matching what comes from the API
export interface TraktImageData {
  traktId: string;
  title: string;
  year: number;
  images: {
    poster: string | null;
    thumb: string | null;
  };
}

interface TraktImageCacheContextType {
  getImageData: (traktId: string | number) => TraktImageData | null;
  cacheImageData: (data: TraktImageData) => void;
  fetchImageData: (traktId: string | number) => Promise<TraktImageData | null>;
  isLoading: (traktId: string | number) => boolean;
  isBlacklisted: (traktId: string | number) => boolean;
}

const TraktImageCacheContext = createContext<TraktImageCacheContextType | null>(null);

// Safe localStorage accessor functions
const isLocalStorageAvailable = () => {
  try {
    if (typeof window === 'undefined') return false;
    if (!window.localStorage) return false;
    
    // Test localStorage
    const testKey = '__test_key__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

const getLocalStorageItem = (key: string): string | null => {
  if (!isLocalStorageAvailable()) return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(`Error reading from localStorage key=${key}:`, e);
    return null;
  }
};

const setLocalStorageItem = (key: string, value: string): boolean => {
  if (!isLocalStorageAvailable()) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error(`Error writing to localStorage key=${key}:`, e);
    return false;
  }
};

// Track rate limited IDs globally with backoff times
const rateLimitedIds = new Map<string, { until: number, retryCount: number }>();

// Track blacklisted IDs globally to prevent repeated requests across renders
const BLACKLISTED_IDS = new Set<string>();

// Maximum backoff time in ms (3 minutes)
const MAX_BACKOFF = 3 * 60 * 1000;

// Base delay for exponential backoff (1 second)
const BASE_DELAY = 1000;

// Maximum concurrent requests to Trakt API
const MAX_CONCURRENT_REQUESTS = 2;

// Maximum number of 404 failures before blacklisting
const MAX_NOT_FOUND_ATTEMPTS = 3;

// Local storage key for blacklist
const BLACKLIST_STORAGE_KEY = 'traktNotFoundBlacklist';

// Immediately load persisted blacklist
try {
  const savedBlacklist = getLocalStorageItem(BLACKLIST_STORAGE_KEY);
  if (savedBlacklist) {
    const parsedBlacklist = JSON.parse(savedBlacklist);
    Object.keys(parsedBlacklist).forEach(id => {
      if (parsedBlacklist[id] >= MAX_NOT_FOUND_ATTEMPTS) {
        BLACKLISTED_IDS.add(id);
        console.log(`Loaded blacklisted Trakt ID on startup: ${id}`);
      }
    });
    console.log(`Loaded ${BLACKLISTED_IDS.size} blacklisted Trakt IDs on startup`);
  }
} catch (err) {
  console.error('Failed to load blacklist from localStorage on startup', err);
}

// Queue for pending fetch requests
type QueuedRequest = {
  id: string;
  resolve: (data: TraktImageData | null) => void;
  reject: (error: Error) => void;
};

// Global request queue
const requestQueue: QueuedRequest[] = [];
let activeRequests = 0;

// Process the next request in the queue
const processNextRequest = () => {
  // If we've reached the concurrency limit or the queue is empty, do nothing
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) {
    return;
  }

  // Get the next request
  const request = requestQueue.shift();
  if (!request) return;

  // Skip blacklisted IDs immediately
  if (BLACKLISTED_IDS.has(request.id)) {
    console.log(`Skipping blacklisted ID from queue: ${request.id}`);
    request.resolve(null);
    // Process next request
    processNextRequest();
    return;
  }

  // Increment active requests
  activeRequests++;

  // Add a delay between requests to avoid hammering the API
  setTimeout(() => {
    // Actually perform the fetch
    makeApiRequest(request.id)
      .then(data => request.resolve(data))
      .catch(error => request.reject(error))
      .finally(() => {
        // Decrement active requests and process the next one
        activeRequests--;
        processNextRequest();
      });
  }, 300); // Add a 300ms delay between requests
};

// The actual fetch function that makes the API request
const makeApiRequest = async (id: string): Promise<TraktImageData | null> => {
  try {
    console.log(`Making API request for Trakt ID: ${id}`);
    const response = await fetch(`/api/trakt/show-image?traktId=${id}`);
    
    if (response.status === 404) {
      console.warn(`404 Not Found for Trakt ID: ${id}`);
      return { status: 404, id } as any; // Special marker for 404
    }
    
    if (response.status === 429) {
      // Handle rate limiting
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 10;
      
      // Get current retry count or default to 0
      const currentInfo = rateLimitedIds.get(id) || { until: 0, retryCount: 0 };
      const newRetryCount = currentInfo.retryCount + 1;
      
      // Calculate backoff with exponential increase
      const backoff = Math.min(
        MAX_BACKOFF,
        (retryAfter * 1000) * Math.pow(2, newRetryCount - 1)
      );
      
      const untilTime = Date.now() + backoff;
      
      // Update rate limit info
      rateLimitedIds.set(id, {
        until: untilTime,
        retryCount: newRetryCount
      });
      
      console.warn(`Rate limited for ID ${id}. Backing off for ${Math.round(backoff/1000)}s (retry #${newRetryCount})`);
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Reset any rate limiting for this ID
    if (rateLimitedIds.has(id)) {
      rateLimitedIds.delete(id);
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching Trakt image for ID ${id}:`, error);
    return null;
  }
};

export function useTraktImageCache() {
  const context = useContext(TraktImageCacheContext);
  if (!context) {
    throw new Error("useTraktImageCache must be used within a TraktImageCacheProvider");
  }
  return context;
}

export function TraktImageCacheProvider({ children }: { children: ReactNode }) {
  // Cache is a Map with traktId as key and image data as value
  const [cache, setCache] = useState<Map<string, TraktImageData>>(new Map());
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  
  // Track IDs that have returned 404 Not Found multiple times
  const [notFoundBlacklist, setNotFoundBlacklist] = useState<Map<string, number>>(new Map());
  
  // Get image data from cache if available
  const getImageData = (traktId: string | number): TraktImageData | null => {
    const id = String(traktId);
    return cache.get(id) || null;
  };
  
  // Add image data to cache
  const cacheImageData = (data: TraktImageData) => {
    if (!data.traktId) return;
    
    setCache(prevCache => {
      const newCache = new Map(prevCache);
      newCache.set(data.traktId, data);
      return newCache;
    });
    
    // Remove from pending requests
    setPendingRequests(prev => {
      const newPending = new Set(prev);
      newPending.delete(data.traktId);
      return newPending;
    });
  };
  
  // Check if a traktId is currently being loaded
  const isLoading = (traktId: string | number): boolean => {
    return pendingRequests.has(String(traktId));
  };

  // Check if a traktId is blacklisted (has failed too many times)
  const isBlacklisted = (traktId: string | number): boolean => {
    const id = String(traktId);
    
    // Check the global blacklist first (for cross-render persistence)
    if (BLACKLISTED_IDS.has(id)) {
      return true;
    }
    
    // Then check the state-managed blacklist
    const failureCount = notFoundBlacklist.get(id) || 0;
    return failureCount >= MAX_NOT_FOUND_ATTEMPTS;
  };

  // Check if we should avoid requesting this ID due to rate limiting
  const isRateLimited = (id: string): boolean => {
    const now = Date.now();
    const limitInfo = rateLimitedIds.get(id);
    
    if (limitInfo && now < limitInfo.until) {
      return true;
    }
    
    if (limitInfo && now >= limitInfo.until) {
      // Clear the rate limit if it's expired
      rateLimitedIds.delete(id);
    }
    
    return false;
  };
  
  // Record a 404 not found for an ID
  const recordNotFound = (id: string) => {
    console.log(`Recording 404 Not Found for ID: ${id}`);
    
    setNotFoundBlacklist(prev => {
      const newBlacklist = new Map(prev);
      const currentCount = newBlacklist.get(id) || 0;
      const newCount = currentCount + 1;
      newBlacklist.set(id, newCount);
      
      // Log when we've blacklisted an ID
      if (newCount >= MAX_NOT_FOUND_ATTEMPTS) {
        console.warn(`Blacklisting Trakt ID ${id} after ${MAX_NOT_FOUND_ATTEMPTS} failed attempts`);
        // Add to global blacklist for immediate effect across renders
        BLACKLISTED_IDS.add(id);
        
        // Also save to localStorage immediately
        try {
          let blacklistObj: Record<string, number> = {};
          // Load existing
          const savedBlacklist = getLocalStorageItem(BLACKLIST_STORAGE_KEY);
          if (savedBlacklist) {
            blacklistObj = JSON.parse(savedBlacklist);
          }
          // Update
          blacklistObj[id] = newCount;
          // Save
          setLocalStorageItem(BLACKLIST_STORAGE_KEY, JSON.stringify(blacklistObj));
        } catch (err) {
          console.error('Failed to save blacklist to localStorage:', err);
        }
      }
      
      return newBlacklist;
    });
  };
  
  // Fetch image data from API and cache it
  const fetchImageData = async (traktId: string | number): Promise<TraktImageData | null> => {
    const id = String(traktId);
    
    // Return from cache if available
    if (cache.has(id)) {
      return cache.get(id) || null;
    }
    
    // Check if this ID is blacklisted due to too many 404s
    if (isBlacklisted(id)) {
      console.log(`Skipping blacklisted Trakt ID: ${id}`);
      return null;
    }
    
    // Check if this ID is currently rate limited
    if (isRateLimited(id)) {
      const limitInfo = rateLimitedIds.get(id);
      const waitTime = limitInfo ? Math.ceil((limitInfo.until - Date.now()) / 1000) : 0;
      console.log(`Skipping fetch for rate-limited ID ${id}, retry in ${waitTime} seconds`);
      return null;
    }
    
    // If already fetching, don't start another request
    if (pendingRequests.has(id)) {
      // Wait for the request to complete
      return new Promise((resolve) => {
        const checkCache = () => {
          if (cache.has(id)) {
            resolve(cache.get(id) || null);
          } else if (!pendingRequests.has(id)) {
            resolve(null); // Request completed but failed
          } else {
            // Check again in 100ms
            setTimeout(checkCache, 100);
          }
        };
        setTimeout(checkCache, 100);
      });
    }
    
    // Mark as pending
    setPendingRequests(prev => {
      const newPending = new Set(prev);
      newPending.add(id);
      return newPending;
    });
    
    // Add to the request queue instead of directly fetching
    return new Promise((resolve, reject) => {
      requestQueue.push({ id, resolve, reject });
      
      // Try to process the queue (if we're under the concurrency limit)
      processNextRequest();
    }).then(data => {
      // Check for special 404 marker
      if (data && (data as any).status === 404) {
        // Record 404 not found
        recordNotFound(id);
        data = null;
      }
      
      // If the request succeeded with data, cache the result
      if (data) {
        cacheImageData(data as TraktImageData);
      }
      
      // Remove from pending even if it failed
      setPendingRequests(prev => {
        const newPending = new Set(prev);
        newPending.delete(id);
        return newPending;
      });
      
      return data as TraktImageData | null;
    }).catch(error => {
      console.error(`Error in queued request for ID ${id}:`, error);
      
      // Remove from pending on error
      setPendingRequests(prev => {
        const newPending = new Set(prev);
        newPending.delete(id);
        return newPending;
      });
      
      return null;
    });
  };
  
  // Load blacklist from localStorage on mount
  useEffect(() => {
    try {
      // Initialize cache from localStorage
      const savedCache = getLocalStorageItem('traktImageCache');
      if (savedCache) {
        const parsedCache = JSON.parse(savedCache);
        const newCache = new Map();
        
        // Convert the parsed object back to a Map
        Object.entries(parsedCache).forEach(([key, value]) => {
          newCache.set(key, value as TraktImageData);
        });
        
        setCache(newCache);
        console.log(`Loaded ${newCache.size} cached Trakt images from storage`);
      }
      
      // Initialize blacklist from localStorage
      const savedBlacklist = getLocalStorageItem(BLACKLIST_STORAGE_KEY);
      if (savedBlacklist) {
        const parsedBlacklist = JSON.parse(savedBlacklist);
        const newBlacklist = new Map();
        
        // Convert the parsed object back to a Map
        Object.entries(parsedBlacklist).forEach(([key, value]) => {
          newBlacklist.set(key, value as number);
          // Add to global set if it meets the threshold
          if ((value as number) >= MAX_NOT_FOUND_ATTEMPTS) {
            BLACKLISTED_IDS.add(key);
          }
        });
        
        setNotFoundBlacklist(newBlacklist);
        console.log(`Loaded ${newBlacklist.size} tracked 404s from storage (${BLACKLISTED_IDS.size} blacklisted)`);
      }
    } catch (err) {
      console.error('Failed to load Trakt image cache from localStorage:', err);
    }
  }, []);
  
  // Save cache to localStorage when it changes
  useEffect(() => {
    if (cache.size > 0) {
      try {
        // Convert Map to object for JSON serialization
        const cacheObj: Record<string, TraktImageData> = {};
        cache.forEach((value, key) => {
          cacheObj[key] = value;
        });
        
        setLocalStorageItem('traktImageCache', JSON.stringify(cacheObj));
      } catch (err) {
        console.error('Failed to save Trakt image cache to localStorage:', err);
      }
    }
  }, [cache]);
  
  // Save blacklist to localStorage when it changes
  useEffect(() => {
    if (notFoundBlacklist.size > 0) {
      try {
        // Convert Map to object for JSON serialization
        const blacklistObj: Record<string, number> = {};
        notFoundBlacklist.forEach((value, key) => {
          blacklistObj[key] = value;
        });
        
        setLocalStorageItem(BLACKLIST_STORAGE_KEY, JSON.stringify(blacklistObj));
      } catch (err) {
        console.error('Failed to save Trakt blacklist to localStorage:', err);
      }
    }
  }, [notFoundBlacklist]);
  
  const value = {
    getImageData,
    cacheImageData,
    fetchImageData,
    isLoading,
    isBlacklisted
  };
  
  return (
    <TraktImageCacheContext.Provider value={value}>
      {children}
    </TraktImageCacheContext.Provider>
  );
} 