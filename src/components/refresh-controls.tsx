"use client";

import { RefreshCcwIcon } from "lucide-react";
import { useRefresh } from "@/lib/refresh-context";
import { useEffect, useState, memo, useRef } from "react";

// Create a completely isolated counter component that updates its own display
// without causing parent re-renders
function IsolatedCounter({ 
  initialValue,
  isRefreshing
}: { 
  initialValue: number;
  isRefreshing: boolean; 
}) {
  const [counter, setCounter] = useState(initialValue);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    setCounter(initialValue);
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Only start counting if not refreshing
    if (!isRefreshing) {
      timerRef.current = setInterval(() => {
        setCounter(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [initialValue, isRefreshing]);
  
  if (isRefreshing) {
    return <span className="text-primary">Refreshing...</span>;
  }
  
  return <span>Next refresh in: {counter}s</span>;
}

// Memoize the component to prevent parent re-renders when countdown changes
export const RefreshControls = memo(function RefreshControls() {
  const { lastChecked, secondsUntilRefresh, refreshData, isRefreshing } = useRefresh();
  const [isClient, setIsClient] = useState(false);

  // Format time in 24-hour format with leading zeros to ensure server/client consistency
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  // Set isClient to true after mount to skip rendering dynamic content during SSR
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
      <div>
        Last checked: {isClient ? (
          <span suppressHydrationWarning>{formatTime(lastChecked)}</span>
        ) : (
          "Loading..."
        )}
        <span className="mx-2">•</span>
        {isClient ? (
          <IsolatedCounter initialValue={secondsUntilRefresh} isRefreshing={isRefreshing} />
        ) : (
          <span>Loading...</span>
        )}
      </div>
      <button
        onClick={refreshData}
        disabled={isRefreshing}
        className={`glass-button flex items-center gap-1 px-3 py-1 text-sm transition-all duration-300 ${
          isRefreshing ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        <RefreshCcwIcon size={14} className={`mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing' : 'Refresh'}
      </button>
    </div>
  );
}); 