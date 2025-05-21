"use client";

import { useEffect, useRef, useState } from "react";

export default function NotificationInitializer() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pruneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastRun, setLastRun] = useState<{
    timestamp: string;
    notifications: number;
    success: boolean;
  } | null>(null);

  // Function to trigger background log processing
  const triggerBackgroundProcessing = async () => {
    try {
      console.log("[Notifications] Triggering background log processing...");
      const response = await fetch("/api/notifications/background", {
        cache: 'no-store', // Ensure we don't get cached responses
        method: 'GET',
        next: { revalidate: 0 } // For Next.js, ensure no caching
      });
      
      if (!response.ok) {
        console.error("[Notifications] Failed to process logs in background:", await response.text());
        return;
      }
      
      const data = await response.json();
      console.log("[Notifications] Background processing complete:", data);
      
      // Update last run status
      setLastRun({
        timestamp: new Date().toISOString(),
        notifications: data.processed?.configuredNotifications || 0,
        success: true
      });
      
      // Log notification count
      if (data.processed?.configuredNotifications > 0) {
        console.log(`[Notifications] Sent ${data.processed.configuredNotifications} notifications based on log configurator settings`);
      }
    } catch (error) {
      console.error("[Notifications] Error triggering background log processing:", error);
      
      // Update last run status for error
      setLastRun({
        timestamp: new Date().toISOString(),
        notifications: 0,
        success: false
      });
    }
  };
  
  // Function to prune old notifications
  const pruneOldNotifications = async () => {
    try {
      console.log("[Notifications] Pruning old notifications...");
      const response = await fetch("/api/notifications/history/prune", {
        cache: 'no-store' // Ensure we don't get cached responses
      });
      
      if (!response.ok) {
        console.error("[Notifications] Failed to prune old notifications:", await response.text());
      } else {
        console.log("[Notifications] Successfully pruned old notifications");
      }
    } catch (error) {
      console.error("[Notifications] Error pruning old notifications:", error);
    }
  };

  useEffect(() => {
    console.log("[Notifications] Initializing notification system...");
    
    // Initial processing - delay by 5 seconds to ensure components are loaded
    const initialTimer = setTimeout(() => {
      console.log("[Notifications] Running initial background processing...");
      triggerBackgroundProcessing();
      pruneOldNotifications();
    }, 5000);
    
    // Set up interval to trigger background log processing after initial run
    setTimeout(() => {
      console.log("[Notifications] Setting up regular background processing interval...");
      intervalRef.current = setInterval(() => {
        triggerBackgroundProcessing();
      }, 30000); // Every 30 seconds
      
      // Set up interval to prune old notifications
      pruneIntervalRef.current = setInterval(() => {
        pruneOldNotifications();
      }, 3600000); // Every hour
    }, 6000);
    
    // Clean up when component unmounts
    return () => {
      console.log("[Notifications] Cleaning up notification system...");
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (pruneIntervalRef.current) {
        clearInterval(pruneIntervalRef.current);
        pruneIntervalRef.current = null;
      }
      clearTimeout(initialTimer);
    };
  }, []);
  
  // This component doesn't render anything
  return null;
} 