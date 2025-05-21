"use client";

import { ScrollTextIcon, ChevronRightIcon, AlertTriangleIcon, XCircleIcon, FileCogIcon } from "lucide-react";
import Link from "next/link";
import type { LogEntry, MediaItem, LogStatistics } from "@/lib/utils";
import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";

export function RecentLogs() {
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [recentSuccesses, setRecentSuccesses] = useState<MediaItem[]>([]);
  const [recentFailures, setRecentFailures] = useState<MediaItem[]>([]);
  const [statistics, setStatistics] = useState<LogStatistics>({
    totalLogs: 0,
    successCount: 0,
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    failedEpisodes: 0,
    successfulGrabs: 0,
    criticalErrors: 0,
    tokenStatus: null
  });
  const [loading, setLoading] = useState(true);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/logs');
      const data = await response.json();
      setRecentLogs(data.recentLogs || []);
      setRecentSuccesses(data.recentSuccesses || []);
      setRecentFailures(data.recentFailures || []);
      setStatistics(data.statistics);
    } catch (error) {
      console.error('Error fetching log data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Listen for refresh events
    const handleRefresh = () => {
      fetchData();
    };
    
    window.addEventListener('refresh-dashboard-data', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-dashboard-data', handleRefresh);
    };
  }, []);
  
  const getLevelColor = (level: string) => {
    switch (level) {
      case "SUCCESS":
        return "bg-success/10 text-success border-success/20";
      case "ERROR":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "WARNING":
        return "bg-warning/10 text-warning border-warning/20";
      case "CRITICAL":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };
  
  const getLevelEmoji = (level: string) => {
    switch (level) {
      case "SUCCESS":
        return "✅";
      case "ERROR":
        return "❌";
      case "WARNING":
        return "⚠️";
      case "CRITICAL":
        return "🚨";
      default:
        return "ℹ️";
    }
  };
  
  // Function to check if a log entry appears to be about media operations
  const isMediaRelatedLog = (message: string) => {
    return message.includes("Season") || 
           message.includes("Episode") || 
           message.includes("movie") || 
           message.includes("torrent") ||
           message.includes("RD (100%)") ||
           message.includes("Successfully handled");
  };
  
  // Get all critical errors by combining:
  // 1. Logs with CRITICAL level
  // 2. Media failures with status "critical"
  const criticalLogEntries = recentLogs.filter(log => log.level === "CRITICAL");
  const criticalFailures = recentFailures.filter(failure => failure.status === "critical");
  const totalCriticalCount = statistics.criticalErrors; // This is from the API
  
  return (
    <div className="glass-card card-glow futuristic-border h-full flex flex-col">
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-semibold flex items-center">
            <ScrollTextIcon size={20} className="mr-2 text-primary" />
            Recent Logs
          </h2>
          <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted">
            Last {recentLogs.length} entries
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          View the most recent activity from your SeerrBridge service
        </p>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground animate-pulse">
              <p>Loading logs...</p>
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p>No logs found</p>
              <p className="text-sm mt-1">
                Configure log types in the Log Configurator with "Recent Logs Section" location to view logs here
              </p>
              {!recentLogs.length && !statistics.successCount && !statistics.errorCount && (
                <Link 
                  href="/dashboard/config" 
                  className="text-primary hover:underline inline-flex items-center gap-1 mt-3"
                >
                  <FileCogIcon className="h-4 w-4" />
                  <span>Configure Log Types</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {recentLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`p-4 hover:bg-primary/5 transition-colors duration-150 
                    ${isMediaRelatedLog(log.message) ? 'bg-primary/10' : ''}
                    ${log.level === "CRITICAL" ? 'bg-destructive/10' : ''}`}
                >
                  <div className="flex justify-between mb-2">
                    <span 
                      className={`text-xs px-2 py-1 rounded-md border ${getLevelColor(log.level)}`}
                    >
                      {getLevelEmoji(log.level)} {log.level}
                    </span>
                    <time className="text-xs text-muted-foreground">
                      {formatDate(log.timestamp)}
                    </time>
                  </div>
                  {log.source && log.source !== "unknown" ? (
                    <div className="font-medium text-sm">{log.source}</div>
                  ) : null}
                  <div className="text-sm mt-1 text-muted-foreground">{log.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-border/50 bg-background/30">
          <div className="flex justify-between items-center">
            <div className="text-sm">
              {recentLogs.length > 0 ? (
                <>
                  <span className="text-success font-medium">{statistics.successfulGrabs} successes</span>
                  <span className="mx-2">•</span>
                  <span className="text-destructive font-medium">{statistics.errorCount} errors</span>
                  <span className="mx-2">•</span>
                  <span className="text-destructive font-bold">{totalCriticalCount} critical errors</span>
                </>
              ) : (
                <span className="text-muted-foreground">No logs configured to display</span>
              )}
            </div>
            
            <div className="flex gap-2">
              {recentLogs.length > 0 ? (
                <>
                  <Link 
                    href="/dashboard/success" 
                    className="text-xs px-3 py-1.5 bg-success/10 text-success rounded-full flex items-center hover:bg-success/20 transition-colors hover:shadow-[0_0_10px_rgba(52,199,89,0.15)]"
                  >
                    View Successes
                    <ChevronRightIcon size={14} className="ml-1" />
                  </Link>
                  <Link 
                    href="/dashboard/failures" 
                    className="text-xs px-3 py-1.5 bg-destructive/10 text-destructive rounded-full flex items-center hover:bg-destructive/20 transition-colors hover:shadow-[0_0_10px_rgba(255,69,58,0.15)]"
                  >
                    View Failures
                    <ChevronRightIcon size={14} className="ml-1" />
                  </Link>
                  <Link 
                    href="/dashboard/critical" 
                    className="text-xs px-3 py-1.5 bg-destructive/20 text-destructive rounded-full flex items-center hover:bg-destructive/30 transition-colors hover:shadow-[0_0_10px_rgba(255,69,58,0.25)]"
                  >
                    <AlertTriangleIcon size={12} className="mr-1" />
                    Critical Errors
                    <ChevronRightIcon size={14} className="ml-1" />
                  </Link>
                </>
              ) : (
                <Link 
                  href="/dashboard/config" 
                  className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full flex items-center hover:bg-primary/20 transition-colors"
                >
                  Configure Log Types
                  <ChevronRightIcon size={14} className="ml-1" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 