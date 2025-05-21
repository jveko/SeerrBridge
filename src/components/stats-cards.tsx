"use client";

import { 
  FileTextIcon, 
  CheckCircleIcon, 
  AlertTriangleIcon, 
  InfoIcon, 
  VideoIcon, 
  FilmIcon,
  CalendarIcon,
  KeyIcon,
  FileCogIcon
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import { RefreshControls } from "./refresh-controls";
import { useRefresh } from "@/lib/refresh-context";
import { format } from "date-fns";
import { StatusIndicator } from "./status-indicator";
import { Button } from "@/components/ui/button";

// Interface for log type patterns from the log configurator
interface LogType {
  id: string;
  name: string;
  pattern: string;
  description: string;
  level: string;
}

interface RecentItem {
  id: string;
  title: string;
  timestamp: string;
  logTypeId?: string; // ID of the matched log type
}

interface StatsCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  colorClass?: string;
  link?: string;
  isRefreshing?: boolean;
  recentItems?: RecentItem[];
  showRecents?: boolean;
}

// Memoize the StatsCard component to prevent unnecessary re-renders
const StatsCard = memo(function StatsCard({ 
  title, 
  value, 
  description, 
  icon, 
  colorClass = "", 
  link,
  isRefreshing,
  recentItems,
  showRecents = false
}: StatsCardProps) {
  const CardComponent = link ? 
    (props: React.HTMLAttributes<HTMLDivElement>) => (
      <Link href={link}>
        <div {...props} />
      </Link>
    ) : 
    (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />;

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "No date";
      }
      
      // Format as short date: MM/DD/YY
      return format(date, "MM/dd/yy");
    } catch (error) {
      return "Invalid date";
    }
  };

  // Define static classes to use for all cards
  const baseClasses = "glass-card card-glow futuristic-border h-48 p-6 transition-all duration-300 overflow-hidden";
  const hoverClasses = link ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : '';
  
  // Standard card layout for smaller cards
  if (!showRecents) {
    return (
      <CardComponent className={`${baseClasses} ${hoverClasses} ${colorClass} relative flex flex-col ${isRefreshing ? 'shimmer-subtle' : 'shimmer'}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground pr-2 break-words">{title}</h3>
          <div className={`text-primary ${isRefreshing ? 'opacity-70' : 'opacity-90'} bg-primary/10 p-2 rounded-lg flex-shrink-0`}>{icon}</div>
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-3xl font-bold tracking-tight truncate">{value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        </div>
      </CardComponent>
    );
  }

  // Split layout for top two cards
  return (
    <CardComponent className={`${baseClasses} ${hoverClasses} ${colorClass} ${isRefreshing ? 'shimmer-subtle' : 'shimmer'}`}>
      <div className="flex h-full">
        {/* Left side with stats */}
        <div className="w-1/2 pr-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground pr-2 break-words">{title}</h3>
            <div className={`text-primary ${isRefreshing ? 'opacity-70' : 'opacity-90'} bg-primary/10 p-2 rounded-lg flex-shrink-0`}>{icon}</div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-3xl font-bold tracking-tight truncate">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          </div>
        </div>
        
        {/* Right side with recent items */}
        <div className="w-1/2 pl-4 border-l border-border/30 flex flex-col">
          {recentItems && recentItems.length > 0 ? (
            <>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center">
                <CalendarIcon className="h-3 w-3 mr-1" /> Recent Items
              </h4>
              <div className="overflow-hidden flex-1">
                <ul className="space-y-1.5">
                  {recentItems.slice(0, 5).map((item) => {
                    // Extract the actual content by looking for patterns like media files
                    // This will extract content like movie/TV show filenames
                    const extractedTitle = extractMediaName(item.title);
                    
                    return (
                      <li key={item.id} className="text-[10px]">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            {/* Using a div with inline styles for guaranteed visibility */}
                            <div 
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: title === "Failed Media" ? '#ef4444' : '#10b981',
                                flexShrink: 0,
                                display: 'block',
                                marginRight: '4px'
                              }}
                            ></div>
                            <span className="truncate max-w-[100px] text-primary-foreground/90" title={item.title}>
                              {extractedTitle}
                            </span>
                          </div>
                          <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                            {formatTimestamp(item.timestamp)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              No recent items
            </div>
          )}
        </div>
      </div>
    </CardComponent>
  );
});

// Function to extract media name from log message
// This attempts to find the actual media name by removing common log patterns
function extractMediaName(message: string): string {
  if (!message) return "Unknown";
  
  // Common prefixes to remove (based on the example pattern)
  const prefixesToRemove = [
    /RD \(\d+%\) button detected\.\s*\d*\s*/i,
    /successfully grabbed/i,
    /download completed/i,
    /download failed/i,
    /error processing/i
  ];
  
  // Common suffixes to remove
  const suffixesToRemove = [
    /\.\s*This entry is complete\.$/i,
    /\.\s*Download completed\.$/i,
    /\.\s*Processing\s+finished\.$/i
  ];
  
  let extractedName = message;
  
  // Remove prefixes
  for (const prefix of prefixesToRemove) {
    extractedName = extractedName.replace(prefix, '');
  }
  
  // Remove suffixes
  for (const suffix of suffixesToRemove) {
    extractedName = extractedName.replace(suffix, '');
  }
  
  // Trim any remaining whitespace
  extractedName = extractedName.trim();
  
  // If nothing meaningful is left, return the original
  if (!extractedName || extractedName.length < 10) {
    return message;
  }
  
  return extractedName;
}

// New interface for token status data
interface TokenStatus {
  expiresOn: string;
  lastRefreshedAt: string;
  status: 'valid' | 'expiring' | 'refreshing' | 'unknown';
  lastCheckedAt: string;
}

// Memoize TokenStatusCard as well
const TokenStatusCard = memo(function TokenStatusCard({ tokenStatus, isRefreshing }: { tokenStatus: TokenStatus | null, isRefreshing?: boolean }) {
  if (!tokenStatus) {
    return (
      <div className="glass-card card-glow futuristic-border p-6 col-span-6 shimmer-subtle">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Real Debrid Access Token</h3>
          <div className="text-primary opacity-90 bg-primary/10 p-2 rounded-lg"><KeyIcon className="h-5 w-5" /></div>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center h-16">
          <p className="text-sm text-muted-foreground">Waiting for token information...</p>
        </div>
      </div>
    );
  }

  // Determine status colors and messages
  const getStatusColor = () => {
    switch (tokenStatus.status) {
      case 'valid': return 'text-success';
      case 'expiring': return 'text-warning';
      case 'refreshing': return 'text-info';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusMessage = () => {
    switch (tokenStatus.status) {
      case 'valid': return 'Token is valid';
      case 'expiring': return 'Token is about to expire';
      case 'refreshing': return 'Token is being refreshed';
      default: return 'Token status unknown';
    }
  };

  // Attempt to format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Unknown';
      return format(date, "MMM dd, yyyy HH:mm:ss");
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Calculate time until expiration
  const calculateTimeUntil = (dateString: string) => {
    try {
      const expiryDate = new Date(dateString);
      const now = new Date();
      if (isNaN(expiryDate.getTime())) return 'Unknown';
      
      const diffMs = expiryDate.getTime() - now.getTime();
      if (diffMs <= 0) return 'Expired';
      
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffDays > 0) {
        return `${diffDays}d ${diffHours}h ${diffMinutes}m`;
      } else if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes}m`;
      } else {
        return `${diffMinutes} minutes`;
      }
    } catch (error) {
      return 'Unknown';
    }
  };

  return (
    <div className={`glass-card card-glow futuristic-border p-6 col-span-6 ${isRefreshing ? 'shimmer-subtle' : 'shimmer'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">Real Debrid Access Token</h3>
        <div className="text-primary opacity-90 bg-primary/10 p-2 rounded-lg"><KeyIcon className="h-5 w-5" /></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Status</span>
          <span className={`text-sm font-medium ${getStatusColor()}`}>{getStatusMessage()}</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Expires On</span>
          <span className="text-sm font-medium">{formatDate(tokenStatus.expiresOn)}</span>
          <span className="text-xs text-muted-foreground mt-1">
            (in {calculateTimeUntil(tokenStatus.expiresOn)})
          </span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Last Refreshed</span>
          <span className="text-sm font-medium">{formatDate(tokenStatus.lastRefreshedAt)}</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Last Checked</span>
          <span className="text-sm font-medium">{formatDate(tokenStatus.lastCheckedAt)}</span>
        </div>
      </div>
    </div>
  );
});

export function StatsCards() {
  const router = useRouter();
  const { isRefreshing } = useRefresh();
  const [statistics, setStatistics] = useState({
    totalLogs: 0,
    successCount: 0,
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    failedEpisodes: 0,
    successfulGrabs: 0,
    criticalErrors: 0,
    recentSuccesses: [] as RecentItem[],
    recentFailures: [] as RecentItem[],
    tokenStatus: null as TokenStatus | null
  });
  const [loading, setLoading] = useState(true);
  const [logTypes, setLogTypes] = useState<LogType[]>([]);

  const fetchData = async () => {
    try {
      // Only show loading state on initial load, not on refreshes
      if (!isRefreshing) setLoading(true);
      
      // Fetch log types from the configuration first
      const configResponse = await fetch('/api/logs/config');
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setLogTypes(configData.logTypes || []);
      }
      
      // Use the updated API endpoint that now uses log type configurations
      const response = await fetch('/api/logs');
      const data = await response.json();
      
      console.log('Stats card received data:', {
        totalLogs: data.statistics.totalLogs,
        successCount: data.statistics.successCount,
        errorCount: data.statistics.errorCount,
        warningCount: data.statistics.warningCount,
        infoCount: data.statistics.infoCount,
        failedEpisodes: data.statistics.failedEpisodes,
        successfulGrabs: data.statistics.successfulGrabs
      });
      
      setStatistics(data.statistics);
    } catch (error) {
      console.error('Error fetching log data:', error);
    } finally {
      // Keep loading true during refresh to maintain the current view
      if (!isRefreshing) setLoading(false);
    }
  };

  // Function to extract content from the log message using the matched log type pattern
  const extractContentFromLog = (item: RecentItem): string => {
    if (!item.logTypeId || !item.title) return item.title;
    
    // Find the matching log type
    const logType = logTypes.find(lt => lt.id === item.logTypeId);
    if (!logType || !logType.pattern) return item.title;
    
    try {
      // Convert the configured pattern to a proper regex with capture groups
      // The pattern is already in regex format with (.*?) for wildcards
      const regexPattern = new RegExp(logType.pattern, 'i');
      
      // Execute the regex on the log message
      const match = regexPattern.exec(item.title);
      
      if (!match) return item.title;
      
      // Extract content from capture groups - assuming the middle capture groups
      // often contain the actual media name we want to display
      
      // If we have multiple capture groups, we want to find the longest one
      // that's likely to be the media name
      if (match.length > 1) {
        // Filter out empty groups and get the longest one
        const captureGroups = match.slice(1).filter(group => group && group.trim().length > 0);
        
        if (captureGroups.length > 0) {
          // Choose the longest capture group that may contain a media name
          // This heuristic assumes the longest group contains the most meaningful content
          const potentialContent = captureGroups.reduce((longest, current) => 
            (longest.length > current.length) ? longest : current, "");
            
          if (potentialContent && potentialContent.length > 5) {
            return potentialContent.trim();
          }
        }
      }
      
      return item.title;
    } catch (error) {
      console.error('Error extracting content from log:', error);
      return item.title;
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

  // Memoize the card grid to prevent re-renders when the refresh countdown changes
  const statsCardsGrid = useMemo(() => (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-6">
      {/* First row: two wide cards with split layout */}
      <div className="col-span-6 sm:col-span-3">
        <StatsCard
          title="Successful Grabs"
          value={statistics.successfulGrabs}
          description={statistics.successfulGrabs === 0 ? "No successful grabs configured to display" : "Successfully processed media"}
          icon={<FilmIcon className="h-5 w-5" />}
          colorClass="hover:border-[hsl(var(--success))] hover:border-opacity-60 hover:shadow-[0_0_15px_rgba(52,199,89,0.15)]"
          link="/success"
          isRefreshing={isRefreshing}
          recentItems={statistics.recentSuccesses.map(item => ({
            ...item,
            title: extractContentFromLog(item)
          }))}
          showRecents={true}
        />
      </div>
      <div className="col-span-6 sm:col-span-3">
        <StatsCard
          title="Failed Media"
          value={statistics.failedEpisodes}
          description={statistics.failedEpisodes === 0 ? "No failed media configured to display" : "TV episodes and movies that failed"}
          icon={<VideoIcon className="h-5 w-5" />}
          colorClass="hover:border-destructive/60 hover:shadow-[0_0_15px_rgba(255,69,58,0.15)]"
          link="/failures"
          isRefreshing={isRefreshing}
          recentItems={statistics.recentFailures.map(item => ({
            ...item,
            title: extractContentFromLog(item)
          }))}
          showRecents={true}
        />
      </div>

      {/* Second row: Equal halves of first row cards (standard layout) */}
      <div className="col-span-6 sm:col-span-3 lg:col-span-3 xl:col-span-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <StatsCard
              title="Total Logs"
              value={statistics.totalLogs}
              description={statistics.totalLogs === 0 ? "No logs configured to display" : "Total log entries recorded"}
              icon={<FileTextIcon className="h-5 w-5" />}
              colorClass="hover:border-primary/60 hover:shadow-[0_0_15px_rgba(138,101,241,0.15)]"
              isRefreshing={isRefreshing}
            />
          </div>
          <div>
            <StatsCard
              title="Successful Operations"
              value={statistics.successCount}
              description={statistics.successCount === 0 ? "No success logs configured" : "Total success messages"}
              icon={<CheckCircleIcon className="h-5 w-5" />}
              colorClass="hover:border-success/60 hover:shadow-[0_0_15px_rgba(52,199,89,0.15)]"
              isRefreshing={isRefreshing}
            />
          </div>
        </div>
      </div>
      
      <div className="col-span-6 sm:col-span-3 lg:col-span-3 xl:col-span-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <StatsCard
              title="Errors"
              value={statistics.errorCount}
              description={statistics.errorCount === 0 ? "No error logs configured" : "Standard error messages"}
              icon={<AlertTriangleIcon className="h-5 w-5" />}
              colorClass="hover:border-destructive/60 hover:shadow-[0_0_15px_rgba(255,69,58,0.15)]"
              link="/dashboard/errors"
              isRefreshing={isRefreshing}
            />
          </div>
          <div>
            <StatsCard
              title="Critical Errors"
              value={statistics.criticalErrors}
              description={statistics.criticalErrors === 0 ? "No critical error logs configured" : "Serious system errors"}
              icon={<AlertTriangleIcon className="h-5 w-5" />}
              colorClass="hover:border-destructive/80 hover:shadow-[0_0_15px_rgba(255,0,0,0.25)]"
              link="/dashboard/critical"
              isRefreshing={isRefreshing}
            />
          </div>
        </div>
      </div>
      
      {/* Full-width Token Status Card now at the bottom */}
      <TokenStatusCard tokenStatus={statistics.tokenStatus} isRefreshing={isRefreshing} />
    </div>
  ), [
    statistics,
    isRefreshing,
    extractContentFromLog
  ]);

  // Display loading state only on initial load, not on refreshes
  if (loading && !isRefreshing) {
    return (
      <div>
        <StatusIndicator />
        <RefreshControls />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array(6).fill(0).map((_, index) => (
            <div 
              key={index} 
              className="glass-card h-48 p-6 animate-pulse opacity-50"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <StatusIndicator />
      <RefreshControls />
      
      {statistics.totalLogs === 0 && !loading && (
        <div className="p-6 glass-card card-glow futuristic-border mb-6 text-center">
          <h3 className="text-lg font-medium mb-2">No logs configured to display</h3>
          <p className="text-muted-foreground mb-4">
            Use the Log Configurator to set up log types and display rules to start seeing statistics.
            Make sure to configure log types for different statistical areas to see data on cards.
          </p>
          <Link href="/dashboard/config">
            <Button>
              <FileCogIcon className="h-4 w-4 mr-1" />
              Configure Logs
            </Button>
          </Link>
        </div>
      )}
      
      {statsCardsGrid}
    </div>
  );
} 