"use client";

import { useState, useEffect } from "react";
import { CheckCircleIcon, XCircleIcon, ActivityIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusResponse {
  status: string;
  version: string;
  uptime: string;
  browser_initialized: boolean;
}

export function StatusIndicator() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const checkStatus = async () => {
    try {
      const response = await fetch("/api/bridge-status", {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.status}`);
      }
      
      const data = await response.json();
      setStatus(data);
      setError(null);
      setLastChecked(new Date());
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : "Unknown error");
      setLastChecked(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check immediately on mount
    checkStatus();
    
    // Set up polling every 30 seconds
    const intervalId = setInterval(checkStatus, 30000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Format the time since last checked
  const getTimeSinceLastChecked = () => {
    if (!lastChecked) return "never";
    
    const seconds = Math.floor((new Date().getTime() - lastChecked.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    return `${Math.floor(seconds / 3600)} hours ago`;
  };

  return (
    <div className="mb-5 px-1">
      <div className="flex items-center justify-between">
        <div className="relative">
          <div 
            className="flex items-center cursor-pointer" 
            onMouseEnter={() => setShowDetails(true)}
            onMouseLeave={() => setShowDetails(false)}
          >
            {isLoading ? (
              <ActivityIcon className="h-5 w-5 text-muted-foreground animate-pulse" />
            ) : status ? (
              <CheckCircleIcon className="h-5 w-5 text-success animate-pulse" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-destructive animate-pulse" />
            )}
            
            <span className={cn(
              "ml-2 text-sm font-medium",
              status ? "text-success" : error ? "text-destructive" : "text-muted-foreground"
            )}>
              {status ? "SeerrBridge Running" : "SeerrBridge Offline"}
            </span>
            
            {/* Simple tooltip implementation */}
            {showDetails && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-popover text-popover-foreground p-3 rounded-md border shadow-md max-w-[250px] text-xs">
                {status ? (
                  <div className="space-y-1">
                    <p><span className="font-semibold">Status:</span> {status.status}</p>
                    <p><span className="font-semibold">Version:</span> {status.version}</p>
                    <p><span className="font-semibold">Uptime:</span> {status.uptime}</p>
                    <p><span className="font-semibold">Browser Status:</span> {status.browser_initialized ? "Initialized" : "Not Initialized"}</p>
                  </div>
                ) : (
                  <div>
                    <p>Unable to connect to SeerrBridge</p>
                    {error && <p className="text-destructive">{error}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Last checked: {getTimeSinceLastChecked()}
        </div>
      </div>
    </div>
  );
} 