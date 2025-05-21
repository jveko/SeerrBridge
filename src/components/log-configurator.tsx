"use client";

import { useState, useEffect, useMemo, Fragment, useCallback } from "react";
import { 
  ScrollTextIcon, 
  FilterIcon, 
  SaveIcon, 
  DownloadIcon, 
  UploadIcon, 
  RotateCcwIcon,
  PlusIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InfoIcon,
  ListFilter,
  FileCogIcon,
  FileIcon,
  Search,
  Wand,
  MoreHorizontal,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/lib/toast-manager";

// Types
interface LogType {
  id: string;
  name: string;
  pattern: string;
  description: string;
  level: "success" | "error" | "warning" | "info" | "critical";
  selectedWords?: string[];
}

interface LogDisplay {
  id: string;
  logTypeId: string;
  location: string[] | "all";
  showNotification: boolean;
  showInCard: boolean;
  triggerStatUpdate: boolean;
}

interface SystemLog {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  source?: string;
  matchedLogTypeId?: string;
  rawLog?: string;
}

interface LogConfiguration {
  version: string;
  logTypes: LogType[];
  logDisplays: LogDisplay[];
  defaultConfig: boolean;
}

// Sample applications in the system
const appLocations = [
  { id: "dashboard", name: "Dashboard" },
  { id: "successes", name: "Successes Page" },
  { id: "failures", name: "Failures Page" },
  { id: "errors", name: "Errors Page" },
  { id: "critical", name: "Critical Errors Page" },
  { id: "stats_success", name: "Success Stats Card" },
  { id: "stats_failure", name: "Failed Media Stats Card" },
  { id: "stats_errors", name: "Errors Stats Card" },
  { id: "stats_info", name: "Info Stats Card" },
  { id: "stats_warnings", name: "Warnings Stats Card" },
  { id: "stats_total", name: "Total Logs Stats Card" },
  { id: "recent_logs", name: "Recent Logs Section" },
  { id: "notifications", name: "System Notifications" },
  { id: "all", name: "All Pages & Components" }
];

// Default log configuration
const defaultLogConfiguration: LogConfiguration = {
  version: "1.0.0",
  defaultConfig: true,
  logTypes: [],  // Start with empty log types
  logDisplays: [] // Start with empty display rules
};

// Add this function for generating regex patterns from selected words
const generatePatternFromSelectedWords = (message: string, selectedWords: string[]): string => {
  if (!selectedWords.length) return '';
  
  // Escape special characters in the selected words for regex safety
  const escapedWords = selectedWords.map(word => 
    word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  );
  
  // Create a pattern that looks for these words in sequence with wildcards in between
  const pattern = escapedWords.join('(.*?)');
  
  return pattern;
};

export function LogConfigurator() {
  const [config, setConfig] = useState<LogConfiguration>(defaultLogConfiguration);
  const [originalConfig, setOriginalConfig] = useState<LogConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedLogType, setSelectedLogType] = useState<LogType | null>(null);
  const [selectedDisplay, setSelectedDisplay] = useState<LogDisplay | null>(null);
  const [isEditingLogType, setIsEditingLogType] = useState(false);
  const [isEditingDisplay, setIsEditingDisplay] = useState(false);
  const [editedLogType, setEditedLogType] = useState<Partial<LogType>>({});
  const [editedDisplay, setEditedDisplay] = useState<Partial<LogDisplay>>({});
  const [activeTab, setActiveTab] = useState("logs");
  
  // For logs tab
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logSearchTerm, setLogSearchTerm] = useState("");
  const [logLevelFilter, setLogLevelFilter] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [isCreatingLogType, setIsCreatingLogType] = useState(false);
  const [logsPagination, setLogsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 25,
    totalItems: 0
  });
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedRawLog, setSelectedRawLog] = useState<string | null>(null);
  
  // For matched logs statistics
  const [matchedLogsStats, setMatchedLogsStats] = useState<{ logTypeId: string, count: number }[]>([]);
  const [isLoadingMatchedStats, setIsLoadingMatchedStats] = useState(false);
  const [selectedMatchedLogTypeId, setSelectedMatchedLogTypeId] = useState<string | null>(null);
  
  // Add a debounce effect for search to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        // Attempt to load from API
        const response = await fetch('/api/logs/config');
        
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
          setOriginalConfig(data);
        } else {
          // If API fails, use default config
          setConfig(defaultLogConfiguration);
          setOriginalConfig(defaultLogConfiguration);
        }
      } catch (error) {
        console.error('Error loading log configuration:', error);
        // Use default config on error
        setConfig(defaultLogConfiguration);
        setOriginalConfig(defaultLogConfiguration);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConfig();
  }, []);
  
  // Update loadLogs to use the direct showToast function
  const loadLogs = async () => {
    try {
      setIsLoadingLogs(true);
      
      // Build query string with all parameters
      const queryParams = new URLSearchParams({
        page: logsPagination.currentPage.toString(),
        limit: logsPagination.itemsPerPage.toString(),
        sort: sortDirection
      });
      
      if (debouncedSearchQuery) {
        queryParams.set('search', debouncedSearchQuery);
      }
      
      if (logLevelFilter) {
        queryParams.set('level', logLevelFilter);
      }
      
      // If filtering by a specific log type, add that to the request
      if (selectedMatchedLogTypeId) {
        queryParams.set('logTypeId', selectedMatchedLogTypeId);
      }
      
      // Fetch logs from the API endpoint with pagination, sort, search and level params
      const response = await fetch(`/api/logs/entries?${queryParams.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Process logs - match against log types
        const processedLogs = data.logs.map((log: any) => {
          // If we're already looking at a specific log type, use that
          if (selectedMatchedLogTypeId) {
            const selectedLogType = config.logTypes.find(lt => lt.id === selectedMatchedLogTypeId);
            if (selectedLogType) {
              try {
                const regex = new RegExp(selectedLogType.pattern, 'i');
                if (regex.test(log.message)) {
                  return {
                    ...log,
                    matchedLogTypeId: selectedLogType.id
                  };
                }
              } catch (error) {
                console.warn("Invalid regex in selected log type", error);
              }
            }
          }
          
          // Otherwise check all log types
          for (const logType of config.logTypes) {
            try {
              const regex = new RegExp(logType.pattern, 'i');
              if (regex.test(log.message)) {
                return {
                  ...log,
                  matchedLogTypeId: logType.id
                };
              }
            } catch (error) {
              // Skip invalid regex patterns
            }
          }
          
          // No match found
          return {
            ...log,
            matchedLogTypeId: undefined
          };
        });
        
        // For log type filtering, we need to filter the processed logs manually to ensure accurate pagination
        let filteredLogs = processedLogs;
        
        if (selectedMatchedLogTypeId) {
          // Re-filter the logs by the selected log type pattern
          const selectedLogType = config.logTypes.find(lt => lt.id === selectedMatchedLogTypeId);
          if (selectedLogType) {
            try {
              const regex = new RegExp(selectedLogType.pattern, 'i');
              filteredLogs = processedLogs.filter((log: any) => regex.test(log.message));
              
              // Set accurate pagination based on actually filtered logs
              const totalFilteredItems = data.total; // This is already filtered by the backend based on queryParams
              
              setLogsPagination(prev => ({
                ...prev,
                totalPages: Math.max(1, Math.ceil(totalFilteredItems / prev.itemsPerPage)),
                totalItems: totalFilteredItems
              }));
              
              setLogs(filteredLogs);
              
              console.log(`Found ${filteredLogs.length} logs on current page matching log type "${selectedLogType.name}" (total: ${totalFilteredItems})`);
              return;
            } catch (error) {
              console.warn("Invalid regex in selected log type", error);
            }
          }
        }
        
        // If no specialized filtering was applied or it failed, use the normal pagination
        setLogs(processedLogs);
        setLogsPagination(prev => ({
          ...prev,
          totalPages: Math.ceil(data.total / prev.itemsPerPage),
          totalItems: data.total
        }));
      } else {
        showToast({
          title: "Failed to Load Logs",
          description: "Could not load log entries from the system.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      showToast({
        title: "Error",
        description: "An error occurred while loading logs.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingLogs(false);
    }
  };
  
  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setLogsPagination(prev => ({
      ...prev,
      currentPage: page
    }));
  };

  // Handle items per page changes
  const handleItemsPerPageChange = (itemsPerPage: number) => {
    setLogsPagination(prev => ({
      ...prev,
      itemsPerPage,
      currentPage: 1 // Reset to first page when changing items per page
    }));
  };

  // Update the useEffect to include logLevelFilter in the dependency array
  useEffect(() => {
    if (activeTab === "logs") {
      loadLogs();
    }
  }, [activeTab, logsPagination.currentPage, logsPagination.itemsPerPage, sortDirection, debouncedSearchQuery, logLevelFilter, selectedMatchedLogTypeId]);
  
  // Show details for a matched log type
  const showLogTypeDetails = (logTypeId: string) => {
    const logType = config.logTypes.find(lt => lt.id === logTypeId);
    if (logType) {
      setSelectedLogType(logType);
      setEditedLogType(logType);
      setIsEditingLogType(true);
    }
  };
  
  // Find matching log type for a message
  const findMatchingLogType = (message: string, specificLogTypeId?: string): LogType | undefined => {
    // If we're filtering by a specific log type, only check that one
    if (specificLogTypeId) {
      const logType = config.logTypes.find(lt => lt.id === specificLogTypeId);
      if (logType) {
        try {
          const regex = new RegExp(logType.pattern, 'i'); // Case insensitive for better matching
          return regex.test(message) ? logType : undefined;
        } catch (error) {
          console.warn(`Invalid regex pattern in log type: ${logType.name}`, error);
          return undefined;
        }
      }
      return undefined;
    }
    
    // Otherwise, check all log types
    // First check if we already have cached results for performance
    if (selectedMatchedLogTypeId) {
      const selectedType = config.logTypes.find(lt => lt.id === selectedMatchedLogTypeId);
      if (selectedType) {
        try {
          const regex = new RegExp(selectedType.pattern, 'i');
          if (regex.test(message)) {
            return selectedType;
          }
        } catch (error) {
          // Continue checking other log types
        }
      }
    }

    // Check all log types if no match found yet
    return config.logTypes.find(logType => {
      try {
        const regex = new RegExp(logType.pattern, 'i'); // Case insensitive
        return regex.test(message);
      } catch (error) {
        console.warn(`Invalid regex pattern in log type: ${logType.name}`, error);
        return false;
      }
    });
  };
  
  // Update the filteredLogs useMemo to have more strict level filtering
  const filteredLogs = useMemo(() => {
    // Define level mappings to handle variations
    const levelAliases: Record<string, string[]> = {
      'info': ['info', 'information', 'inf'],
      'debug': ['debug', 'dbg'],
      'success': ['success', 'ok', 'succeeded'],
      'warning': ['warning', 'warn', 'attention'],
      'error': ['error', 'err', 'failure', 'failed'],
      'critical': ['critical', 'crit', 'fatal']
    };
    
    return logs.filter(log => {
      // If filtering by log type specifically, check if message matches the pattern directly
      if (selectedMatchedLogTypeId) {
        const selectedLogType = config.logTypes.find(lt => lt.id === selectedMatchedLogTypeId);
        if (selectedLogType) {
          try {
            const regex = new RegExp(selectedLogType.pattern, 'i');
            const matchesSelectedType = regex.test(log.message);
            
            // If not matching, exit early
            if (!matchesSelectedType) {
              return false;
            }
          } catch (error) {
            console.warn("Invalid regex in selected log type", error);
          }
        }
      }
      
      // If there's a search term, check across all fields including raw log
      const matchesSearch = !logSearchTerm || 
        log.message.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        (log.source && log.source.toLowerCase().includes(logSearchTerm.toLowerCase())) ||
        log.timestamp.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        log.level.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        (log.rawLog && log.rawLog.toLowerCase().includes(logSearchTerm.toLowerCase()));
      
      // Strict level filtering - only match logs with proper level tag
      const matchesLevel = !logLevelFilter || 
        log.level.toLowerCase() === logLevelFilter.toLowerCase() ||
        (logLevelFilter && levelAliases[logLevelFilter.toLowerCase()]?.includes(log.level.toLowerCase()));
      
      return matchesSearch && matchesLevel;
    });
  }, [logs, logSearchTerm, logLevelFilter, selectedMatchedLogTypeId, config.logTypes]);
  
  // Create a new log type from a selected log
  const handleCreateLogType = () => {
    if (!selectedLog) return;
    
    // Extract a potential pattern from the log message
    const message = selectedLog.message;
    // Simple pattern extraction - escape special chars and replace specific parts with capture groups
    const escapedMessage = message
      .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') // escape regex special chars
      .replace(/\d+/g, '(\\d+)')  // replace numbers with number capture groups
      .replace(/[a-zA-Z]+(\s[a-zA-Z]+)+/g, '(.*?)'); // replace word sequences with wildcards
    
    setEditedLogType({
      id: `log-type-${Date.now()}`,
      name: `New Log Type from ${selectedLog.level}`,
      pattern: escapedMessage,
      description: `Created from log: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
      level: (selectedLog.level.toLowerCase() as "success" | "error" | "warning" | "info" | "critical") || "info"
    });
    
    setIsEditingLogType(true);
    setIsCreatingLogType(false);
  };
  
  // Get level badge for system logs
  const getSystemLogLevelBadge = (level: string) => {
    const normalizedLevel = level.toLowerCase();
    
    if (normalizedLevel.includes("debug")) {
      return <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">Debug</Badge>;
    } else if (normalizedLevel.includes("success")) {
      return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Success</Badge>;
    } else if (normalizedLevel.includes("error")) {
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Error</Badge>;
    } else if (normalizedLevel.includes("warning") || normalizedLevel.includes("warn")) {
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Warning</Badge>;
    } else if (normalizedLevel.includes("critical")) {
      return <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">Critical</Badge>;
    } else {
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Info</Badge>;
    }
  };
  
  // Save configuration
  const saveConfiguration = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/logs/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...config,
          defaultConfig: false
        })
      });
      
      if (response.ok) {
        showToast({
          title: "Configuration Saved",
          description: "Your log configuration has been saved successfully."
        });
        setOriginalConfig(config);
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      showToast({
        title: "Save Failed",
        description: "There was an error saving your configuration.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset to defaults
  const resetToDefaults = () => {
    setConfig(defaultLogConfiguration);
    showToast({
      title: "Reset to Defaults",
      description: "Configuration reset to defaults. Click Save to apply changes."
    });
  };
  
  // Reset to original
  const resetToOriginal = () => {
    if (originalConfig) {
      setConfig(originalConfig);
      showToast({
        title: "Changes Discarded",
        description: "Your changes have been discarded."
      });
    }
  };
  
  // Export configuration
  const exportConfiguration = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "logconfig.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    showToast({
      title: "Configuration Exported",
      description: "Your configuration has been exported as logconfig.json"
    });
  };
  
  // Import configuration
  const importConfiguration = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files.length > 0) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = e => {
        if (e.target?.result) {
          try {
            const importedConfig = JSON.parse(e.target.result as string) as LogConfiguration;
            
            // Basic validation
            if (!importedConfig.logTypes || !importedConfig.logDisplays || !importedConfig.version) {
              throw new Error("Invalid configuration file format");
            }
            
            setConfig(importedConfig);
            showToast({
              title: "Configuration Imported",
              description: "The configuration has been imported. Click Save to apply changes."
            });
          } catch (error) {
            showToast({
              title: "Import Failed",
              description: "The selected file is not a valid configuration file.",
              variant: "destructive"
            });
          }
        }
      };
    }
  };
  
  // Add new log type
  const addNewLogType = () => {
    const newId = `log-type-${Date.now()}`;
    setEditedLogType({
      id: newId,
      name: "",
      pattern: "",
      description: "",
      level: "info"
    });
    setIsEditingLogType(true);
  };
  
  // Save log type
  const saveLogType = () => {
    if (isEditingLogType && editedLogType.name && editedLogType.pattern) {
      if (editedLogType.id && config.logTypes.some(lt => lt.id === editedLogType.id)) {
        // Update existing
        setConfig(prev => ({
          ...prev,
          logTypes: prev.logTypes.map(lt => 
            lt.id === editedLogType.id ? { ...lt, ...editedLogType } as LogType : lt
          )
        }));
      } else {
        // Add new
        setConfig(prev => ({
          ...prev,
          logTypes: [...prev.logTypes, editedLogType as LogType]
        }));
      }
      setIsEditingLogType(false);
      setEditedLogType({});
    }
  };
  
  // Add new display rule
  const addNewDisplayRule = () => {
    if (config.logTypes.length === 0) {
      showToast({
        title: "Cannot Add Display Rule",
        description: "You need to create log types first.",
        variant: "destructive"
      });
      return;
    }
    
    const newId = `display-${Date.now()}`;
    setEditedDisplay({
      id: newId,
      logTypeId: config.logTypes[0].id,
      location: "all",
      showNotification: false,
      showInCard: false,
      triggerStatUpdate: false
    });
    setIsEditingDisplay(true);
  };
  
  // Save display rule
  const saveDisplayRule = () => {
    if (isEditingDisplay && editedDisplay.logTypeId && editedDisplay.location) {
      if (editedDisplay.id && config.logDisplays.some(ld => ld.id === editedDisplay.id)) {
        // Update existing
        setConfig(prev => ({
          ...prev,
          logDisplays: prev.logDisplays.map(ld => 
            ld.id === editedDisplay.id ? { ...ld, ...editedDisplay } as LogDisplay : ld
          )
        }));
      } else {
        // Add new
        setConfig(prev => ({
          ...prev,
          logDisplays: [...prev.logDisplays, editedDisplay as LogDisplay]
        }));
      }
      setIsEditingDisplay(false);
      setEditedDisplay({});
    }
  };
  
  // Delete log type
  const deleteLogType = (id: string) => {
    // Check if this log type is used in any display rules
    const isUsed = config.logDisplays.some(display => display.logTypeId === id);
    
    if (isUsed) {
      showToast({
        title: "Cannot Delete Log Type",
        description: "This log type is used in one or more display rules. Remove those first.",
        variant: "destructive"
      });
      return;
    }
    
    setConfig(prev => ({
      ...prev,
      logTypes: prev.logTypes.filter(lt => lt.id !== id)
    }));
    
    showToast({
      title: "Log Type Deleted",
      description: "The log type has been removed."
    });
  };
  
  // Delete display rule
  const deleteDisplayRule = (id: string) => {
    setConfig(prev => ({
      ...prev,
      logDisplays: prev.logDisplays.filter(ld => ld.id !== id)
    }));
    
    showToast({
      title: "Display Rule Deleted",
      description: "The display rule has been removed."
    });
  };
  
  // Edit log type
  const editLogType = (logType: LogType) => {
    setEditedLogType({ ...logType });
    setIsEditingLogType(true);
  };
  
  // Edit display rule
  const editDisplayRule = (display: LogDisplay) => {
    setEditedDisplay({ ...display });
    setIsEditingDisplay(true);
  };
  
  // Get level badge style
  const getLevelBadge = (level: string) => {
    switch (level) {
      case "success":
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Success</Badge>;
      case "error":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Error</Badge>;
      case "warning":
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Warning</Badge>;
      case "critical":
        return <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">Critical</Badge>;
      default:
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Info</Badge>;
    }
  };
  
  // Get level icon
  const getLevelIcon = (level: string) => {
    switch (level) {
      case "success":
        return <CheckCircleIcon className="h-4 w-4 text-success" />;
      case "error":
        return <XCircleIcon className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangleIcon className="h-4 w-4 text-warning" />;
      case "critical":
        return <AlertTriangleIcon className="h-4 w-4 text-destructive" />;
      default:
        return <InfoIcon className="h-4 w-4 text-primary" />;
    }
  };
  
  // Filtered log types based on search term
  const filteredLogTypes = config.logTypes.filter(logType => 
    logType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    logType.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    logType.pattern.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Toggle sort direction function
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === "desc" ? "asc" : "desc");
  };

  const handleLogRowClick = (log: SystemLog) => {
    if (log.rawLog) {
      setSelectedRawLog(log.rawLog);
    }
  };

  // Load matched logs statistics
  const loadMatchedLogsStats = async () => {
    try {
      setIsLoadingMatchedStats(true);
      // Attempt to fetch from API
      try {
        const response = await fetch('/api/logs/stats/matches');
        
        if (response.ok) {
          const data = await response.json();
          setMatchedLogsStats(data.stats || []);
          return; // Exit early if API call succeeds
        }
      } catch (error) {
        console.error('API error:', error);
        // Continue to fallback if API fails
      }
      
      // Fallback: Calculate stats locally if API fails
      // First, fetch all logs if we don't have them already
      let logsToProcess = logs;
      if (logs.length === 0) {
        try {
          const logsResponse = await fetch(
            `/api/logs/entries?limit=1000&sort=${sortDirection}`
          );
          
          if (logsResponse.ok) {
            const data = await logsResponse.json();
            logsToProcess = data.logs;
          }
        } catch (error) {
          console.error('Error fetching logs for stats calculation:', error);
        }
      }
      
      // Initialize count for each log type
      const statsMap = new Map<string, number>();
      
      // Make sure all log types are represented in the stats, even with zero counts
      config.logTypes.forEach(logType => {
        statsMap.set(logType.id, 0);
      });
      
      // Calculate stats from logs
      for (const log of logsToProcess) {
        for (const logType of config.logTypes) {
          try {
            // Ensure case insensitive matching
            const regex = new RegExp(logType.pattern, 'i');
            if (regex.test(log.message)) {
              statsMap.set(logType.id, (statsMap.get(logType.id) || 0) + 1);
            }
          } catch (error) {
            console.warn(`Invalid regex pattern in log type: ${logType.name}`, error);
            // Skip invalid regex patterns
          }
        }
      }
      
      // Convert map to array format
      const calculatedStats = Array.from(statsMap.entries())
        .map(([logTypeId, count]) => ({
          logTypeId,
          count
        }))
        .filter(stat => stat.count > 0 || config.logTypes.some(lt => lt.id === stat.logTypeId));
      
      console.log('Calculated log type stats:', calculatedStats);
      setMatchedLogsStats(calculatedStats);
      
    } catch (error) {
      console.error('Error loading matched logs statistics:', error);
      showToast({
        title: "Error",
        description: "An error occurred while calculating log statistics.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMatchedStats(false);
    }
  };

  // Filter logs by log type
  const filterLogsByType = (logTypeId: string) => {
    // Update the selected log type ID
    setSelectedMatchedLogTypeId(logTypeId);
    
    // Get the log type
    const logType = config.logTypes.find(lt => lt.id === logTypeId);
    if (!logType) return;
    
    // Don't filter by level - we want all logs matching the pattern regardless of level
    setLogLevelFilter(null);
    setSearchQuery("");  // Clear any existing search
    
    // Reset to first page
    setLogsPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
    
    // Switch to logs tab
    setActiveTab("logs");
    
    // Highlight the selected log type for visual feedback
    const updatedStats = matchedLogsStats.map(stat => {
      return {
        ...stat,
        selected: stat.logTypeId === logTypeId
      };
    });
    setMatchedLogsStats(updatedStats);
    
    // Force reload logs with the new filter
    setTimeout(() => {
      loadLogs();
    }, 0);
    
    showToast({
      title: "Filter Applied",
      description: `Filtering logs that match: ${logType.name}`
    });
  };

  // Add a function to calculate filtered logs count
  const getFilteredLogsCount = useCallback(() => {
    if (selectedMatchedLogTypeId) {
      const logType = config.logTypes.find(lt => lt.id === selectedMatchedLogTypeId);
      if (logType) {
        try {
          const regex = new RegExp(logType.pattern, 'i');
          return logs.filter(log => regex.test(log.message)).length;
        } catch (error) {
          return logs.length;
        }
      }
    }
    return logs.length;
  }, [logs, selectedMatchedLogTypeId, config.logTypes]);

  // Clear the log type filter
  const clearLogTypeFilter = () => {
    setSelectedMatchedLogTypeId(null);
    setLogLevelFilter(null);
    setLogsPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
    
    // Force reload logs
    setTimeout(() => {
      loadLogs();
    }, 0);
    
    showToast({
      title: "Filter Cleared",
      description: "Showing all logs"
    });
  };

  // Update the matchedLogsStats useEffect to include the activeTab dependency
  useEffect(() => {
    if (config.logTypes.length > 0 && activeTab === "log-types") {
      loadMatchedLogsStats();
    }
  }, [config.logTypes, activeTab]);

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center">
          <ScrollTextIcon className="mr-2 h-6 w-6" />
          Log Configurator
        </h2>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetToOriginal}
            disabled={!originalConfig || JSON.stringify(config) === JSON.stringify(originalConfig)}
          >
            <RotateCcwIcon className="h-4 w-4 mr-1" />
            Discard Changes
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetToDefaults}
          >
            <RotateCcwIcon className="h-4 w-4 mr-1" />
            Reset to Defaults
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportConfiguration}
          >
            <DownloadIcon className="h-4 w-4 mr-1" />
            Export
          </Button>
          
          <label 
            htmlFor="import-config" 
            className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
          >
            <UploadIcon className="h-4 w-4 mr-1" />
            Import
            <input 
              id="import-config" 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={importConfiguration}
            />
          </label>
          
          <Button 
            onClick={saveConfiguration} 
            disabled={isLoading || JSON.stringify(config) === JSON.stringify(originalConfig)}
          >
            <SaveIcon className="h-4 w-4 mr-1" />
            Save Configuration
          </Button>
        </div>
      </div>
      
      <p className="text-muted-foreground text-sm">
        Configure how logs are processed, displayed, and where they appear throughout the application.
      </p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="logs">
            <FileIcon className="h-4 w-4 mr-2" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="log-types">
            <FileCogIcon className="h-4 w-4 mr-2" />
            Log Types
          </TabsTrigger>
          <TabsTrigger value="display-rules">
            <ListFilter className="h-4 w-4 mr-2" />
            Display Rules
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="logs" className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
            <div className="relative w-full max-w-md">
              <Input
                placeholder="Search in all fields (date, level, message, etc.)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-10 px-3"
                  onClick={() => setSearchQuery("")}
                >
                  <XCircleIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSortDirection}
                className="flex items-center gap-1"
              >
                {sortDirection === "desc" ? (
                  <>
                    <ArrowDown className="h-4 w-4" />
                    <span>Newest First</span>
                  </>
                ) : (
                  <>
                    <ArrowUp className="h-4 w-4" />
                    <span>Oldest First</span>
                  </>
                )}
              </Button>
              
              <Select
                value={logLevelFilter || "all"}
                onValueChange={(value) => setLogLevelFilter(value === "all" ? null : value)}
              >
                <SelectTrigger className="h-10 w-[150px]">
                  <SelectValue placeholder="Filter by level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={logsPagination.itemsPerPage.toString()}
                onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}
              >
                <SelectTrigger className="h-10 w-[150px]">
                  <SelectValue placeholder="Items per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                  <SelectItem value="250">250 per page</SelectItem>
                  <SelectItem value="500">500 per page</SelectItem>
                  <SelectItem value="1000">1000 per page</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadLogs}
                disabled={isLoadingLogs}
              >
                <RotateCcwIcon className="h-4 w-4 mr-1" />
                Refresh Logs
              </Button>
            </div>
          </div>
          
          {/* Active filter indicator */}
          {selectedMatchedLogTypeId && (
            <div className="flex items-center justify-between bg-accent/20 px-4 py-2 rounded-md mb-4">
              <div className="flex items-center">
                <ListFilter className="h-4 w-4 mr-2 text-primary" />
                <span>
                  Filtering logs matched by: <strong>{config.logTypes.find(lt => lt.id === selectedMatchedLogTypeId)?.name}</strong>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearLogTypeFilter}
              >
                <XCircleIcon className="h-4 w-4 mr-1" />
                Clear Filter
              </Button>
            </div>
          )}
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-accent/10" 
                    onClick={toggleSortDirection}
                  >
                    <div className="flex items-center gap-1">
                      Timestamp
                      {sortDirection === "desc" ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-[50%]">Message</TableHead>
                  <TableHead>Log Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingLogs ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const matchedLogType = log.matchedLogTypeId 
                      ? config.logTypes.find(lt => lt.id === log.matchedLogTypeId)
                      : undefined;
                      
                    return (
                      <TableRow 
                        key={log.id} 
                        className={matchedLogType ? "" : "bg-muted/20"} 
                        onClick={() => handleLogRowClick(log)}
                        style={{ cursor: 'pointer' }}
                      >
                        <TableCell className="font-mono text-xs">
                          {log.timestamp}
                        </TableCell>
                        <TableCell>
                          {getSystemLogLevelBadge(log.level)}
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate font-mono text-xs">
                          {log.source || "—"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.message}
                        </TableCell>
                        <TableCell>
                          {matchedLogType ? (
                            <Badge variant="outline" className="bg-primary/10">
                              {matchedLogType.name}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted">
                              Unmatched
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {matchedLogType ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => showLogTypeDetails(matchedLogType.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Log Type
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setEditedLogType(matchedLogType);
                                  setIsEditingLogType(true);
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Log Type
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                // Stop event propagation to prevent also triggering the row click
                                e.stopPropagation();
                                setSelectedLog(log);
                                setIsCreatingLogType(true);
                              }}
                            >
                              <Wand className="h-4 w-4 mr-1" />
                              Create Type
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4">
            <div className="text-sm text-muted-foreground">
              {selectedMatchedLogTypeId ? (
                <>
                  Showing {filteredLogs.length} matched logs
                  {searchQuery || logLevelFilter ? " (filtered)" : ""}
                  <span className="ml-2 font-semibold">
                    Total: {getFilteredLogsCount()} matched logs
                  </span>
                </>
              ) : (
                <>
                  Showing {filteredLogs.length} logs (page {logsPagination.currentPage} of {logsPagination.totalPages})
                  {searchQuery || logLevelFilter ? " (filtered)" : ""}
                  <span className="ml-2 font-semibold">Total: {logsPagination.totalItems} logs</span>
                </>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Select 
                value={logsPagination.itemsPerPage.toString()}
                onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}
              >
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue placeholder="Items per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                  <SelectItem value="250">250 per page</SelectItem>
                  <SelectItem value="500">500 per page</SelectItem>
                  <SelectItem value="1000">1000 per page</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-1">
                <span className="text-sm">Go to:</span>
                <Input
                  type="number"
                  min={1}
                  max={logsPagination.totalPages}
                  value={logsPagination.currentPage.toString()}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (!isNaN(page) && page >= 1 && page <= logsPagination.totalPages) {
                      handlePageChange(page);
                    }
                  }}
                  className="h-8 w-16 text-center"
                />
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePageChange(1)}
                  disabled={logsPagination.currentPage === 1 || isLoadingLogs}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePageChange(logsPagination.currentPage - 1)}
                  disabled={logsPagination.currentPage === 1 || isLoadingLogs}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {[1, logsPagination.currentPage, logsPagination.totalPages].filter((value, index, self) => 
                  self.indexOf(value) === index && value >= 1 && value <= logsPagination.totalPages
                ).sort((a, b) => a - b).map((page, index, array) => (
                  <Fragment key={page}>
                    <Button
                      variant={page === logsPagination.currentPage ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(page)}
                      disabled={isLoadingLogs}
                    >
                      {page}
                    </Button>
                    
                    {index < array.length - 1 && array[index + 1] - page > 1 && (
                      <span className="px-1">...</span>
                    )}
                  </Fragment>
                ))}
                
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePageChange(logsPagination.currentPage + 1)}
                  disabled={logsPagination.currentPage === logsPagination.totalPages || isLoadingLogs}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePageChange(logsPagination.totalPages)}
                  disabled={logsPagination.currentPage === logsPagination.totalPages || isLoadingLogs}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="log-types" className="space-y-4">
          <div className="flex justify-between mb-4">
            <div className="relative w-full max-w-sm">
              <Input
                placeholder="Search log types..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            
            <Button onClick={addNewLogType}>
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Log Type
            </Button>
          </div>
          
          {/* Matched Logs Statistics */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <ListFilter className="h-4 w-4 mr-2" />
                Matched Logs
              </CardTitle>
              <CardDescription>
                Click on a log type to filter logs by that type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMatchedStats ? (
                <div className="py-4 text-center text-muted-foreground">
                  <div className="inline-flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading statistics...
                  </div>
                </div>
              ) : matchedLogsStats.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">
                  <div className="flex flex-col items-center">
                    <AlertTriangleIcon className="h-10 w-10 text-muted-foreground opacity-20 mb-2" />
                    <p>No matched logs found. Process some logs first.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={loadMatchedLogsStats}
                      className="mt-4"
                    >
                      <RotateCcwIcon className="h-3 w-3 mr-1" />
                      Refresh Stats
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* First, show matches with count > 0, sorted by count */}
                  {matchedLogsStats
                    .filter(stat => stat.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .map(stat => {
                      const logType = config.logTypes.find(lt => lt.id === stat.logTypeId);
                      if (!logType) return null;
                      
                      return (
                        <Button
                          key={stat.logTypeId}
                          variant="outline"
                          className={`justify-between h-auto py-3 px-4 hover:bg-accent/20 ${
                            selectedMatchedLogTypeId === stat.logTypeId ? "border-primary border-2 bg-primary/5" : ""
                          }`}
                          onClick={() => filterLogsByType(stat.logTypeId)}
                        >
                          <div className="flex items-center">
                            {getLevelIcon(logType.level)}
                            <span className="ml-2 text-left">{logType.name}</span>
                          </div>
                          <Badge 
                            variant={selectedMatchedLogTypeId === stat.logTypeId ? "default" : "secondary"}
                            className="ml-2"
                          >
                            {stat.count} logs
                          </Badge>
                        </Button>
                      );
                    })}
                
                  {/* Then, show log types with count = 0, if any exist */}
                  {matchedLogsStats
                    .filter(stat => stat.count === 0)
                    .map(stat => {
                      const logType = config.logTypes.find(lt => lt.id === stat.logTypeId);
                      if (!logType) return null;
                      
                      return (
                        <Button
                          key={stat.logTypeId}
                          variant="outline"
                          className="justify-between h-auto py-3 px-4 opacity-60 hover:opacity-100 hover:bg-accent/10"
                          onClick={() => {
                            showToast({
                              title: "No Logs Found",
                              description: `No logs match the pattern for "${logType.name}"`,
                              variant: "default"
                            });
                          }}
                        >
                          <div className="flex items-center">
                            {getLevelIcon(logType.level)}
                            <span className="ml-2 text-left">{logType.name}</span>
                          </div>
                          <Badge variant="outline" className="ml-2">
                            0 logs
                          </Badge>
                        </Button>
                      );
                    })}
                
                  {/* If no log types with zero matches, show a message */}
                  {matchedLogsStats.filter(stat => stat.count === 0).length === 0 && 
                   config.logTypes.length > matchedLogsStats.filter(stat => stat.count > 0).length && (
                    <div className="col-span-full text-center text-sm text-muted-foreground mt-2">
                      Note: {config.logTypes.length - matchedLogsStats.filter(stat => stat.count > 0).length} log type(s) have no matching logs and are not shown.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-xs text-muted-foreground">
                {matchedLogsStats.filter(stat => stat.count > 0).length > 0 ? 
                  `Found matches for ${matchedLogsStats.filter(stat => stat.count > 0).length} of ${config.logTypes.length} log types` : 
                  "No log types have matching logs"}
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={loadMatchedLogsStats}
                disabled={isLoadingMatchedStats}
              >
                <RotateCcwIcon className="h-3 w-3 mr-1" />
                Refresh Stats
              </Button>
            </CardFooter>
          </Card>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="hidden md:table-cell">Pattern</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogTypes.map(logType => (
                <TableRow key={logType.id}>
                  <TableCell>{logType.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {getLevelIcon(logType.level)}
                      <span className="ml-2">{getLevelBadge(logType.level)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-xs truncate">
                    <code className="text-xs bg-muted p-1 rounded">{logType.pattern}</code>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {logType.description}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => editLogType(logType)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteLogType(logType.id)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              
              {filteredLogTypes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    {searchQuery ? "No log types match your search" : "No log types defined"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
        
        <TabsContent value="display-rules" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button onClick={addNewDisplayRule}>
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Display Rule
            </Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Log Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Show Notification</TableHead>
                <TableHead className="text-center">Show In Card</TableHead>
                <TableHead className="text-center">Update Stats</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.logDisplays.map(display => {
                const logType = config.logTypes.find(lt => lt.id === display.logTypeId);
                return (
                  <TableRow key={display.id}>
                    <TableCell>
                      <div className="flex items-center">
                        {logType && getLevelIcon(logType.level)}
                        <span className="ml-2">{logType?.name || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {display.location === "all" ? (
                        <Badge className="bg-primary/10">All Pages</Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(display.location) && display.location.map(loc => {
                            const location = appLocations.find(l => l.id === loc);
                            return location ? (
                              <Badge key={loc} variant="outline" className="bg-muted/30">
                                {location.name}
                              </Badge>
                            ) : null;
                          })}
                          {Array.isArray(display.location) && display.location.length === 0 && (
                            <span className="text-xs text-muted-foreground">No locations</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {display.showNotification ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-success mx-auto">
                          <path d="M20 6 9 17l-5-5"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground mx-auto">
                          <path d="M18 6 6 18"/>
                          <path d="m6 6 12 12"/>
                        </svg>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {display.showInCard ? 
                        <CheckCircleIcon className="h-4 w-4 text-success mx-auto" /> : 
                        <XCircleIcon className="h-4 w-4 text-muted-foreground mx-auto" />
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      {display.triggerStatUpdate ? 
                        <CheckCircleIcon className="h-4 w-4 text-success mx-auto" /> : 
                        <XCircleIcon className="h-4 w-4 text-muted-foreground mx-auto" />
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => editDisplayRule(display)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteDisplayRule(display.id)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {config.logDisplays.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No display rules defined
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
      
      {/* Dialog for creating a log type from a log entry */}
      <Dialog open={isCreatingLogType} onOpenChange={setIsCreatingLogType}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Log Type from Log</DialogTitle>
            <DialogDescription>
              Create a new log type pattern based on this log entry
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4 py-4">
              <div className="p-4 border rounded-md bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs">{selectedLog.timestamp}</span>
                  {getSystemLogLevelBadge(selectedLog.level)}
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">
                  {selectedLog.message}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="border rounded-md p-3 bg-muted/10">
                  <h4 className="text-sm font-medium mb-2">Select words to include in pattern:</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedLog.message.split(/\s+/).map((word, index) => (
                      <Button
                        key={`${word}-${index}`}
                        variant="outline"
                        size="sm"
                        className={`text-xs ${
                          editedLogType.selectedWords?.includes(word) 
                            ? 'bg-primary/20 border-primary' 
                            : ''
                        }`}
                        onClick={() => {
                          setEditedLogType(prev => {
                            const selectedWords = prev.selectedWords || [];
                            if (selectedWords.includes(word)) {
                              return {
                                ...prev,
                                selectedWords: selectedWords.filter(w => w !== word)
                              };
                            } else {
                              return {
                                ...prev,
                                selectedWords: [...selectedWords, word]
                              };
                            }
                          });
                        }}
                      >
                        {word}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click on words to include in your pattern. Non-selected words will be replaced with wildcards.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Generated Pattern Preview:</Label>
                  <code className="text-xs bg-muted p-2 rounded block whitespace-pre-wrap break-all">
                    {generatePatternFromSelectedWords(
                      selectedLog.message, 
                      editedLogType.selectedWords || []
                    )}
                  </code>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                The pattern will match logs that contain the selected words in order, with any content in between.
                You'll be able to further edit the pattern in the next step.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingLogType(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (selectedLog) {
                const generatedPattern = generatePatternFromSelectedWords(
                  selectedLog.message, 
                  editedLogType.selectedWords || []
                );
                
                setEditedLogType({
                  id: `log-type-${Date.now()}`,
                  name: `New Log Type from ${selectedLog.level}`,
                  pattern: generatedPattern,
                  description: `Created from log: ${selectedLog.message.substring(0, 100)}${selectedLog.message.length > 100 ? '...' : ''}`,
                  level: (selectedLog.level.toLowerCase() as "success" | "error" | "warning" | "info" | "critical") || "info"
                });
                
                setIsCreatingLogType(false);
                setIsEditingLogType(true);
              }
            }}>
              <Wand className="h-4 w-4 mr-1" />
              Create Log Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Original dialogs */}
      <Dialog open={isEditingLogType} onOpenChange={setIsEditingLogType}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editedLogType.id && config.logTypes.some(lt => lt.id === editedLogType.id) ? "Edit" : "Add"} Log Type</DialogTitle>
            <DialogDescription>
              Define how logs are identified in the system
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="log-name">Name</Label>
              <Input
                id="log-name"
                placeholder="Media Grab Success"
                value={editedLogType.name || ""}
                onChange={e => setEditedLogType(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="log-pattern">Pattern (RegEx)</Label>
              <Input
                id="log-pattern"
                placeholder="(Successfully grabbed|RD download completed) (.*?)(movie|episode|season)"
                value={editedLogType.pattern || ""}
                onChange={e => setEditedLogType(prev => ({ ...prev, pattern: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Regular expression pattern to match log entries
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="log-description">Description</Label>
              <Textarea
                id="log-description"
                placeholder="Logs for successful media grabs from Real-Debrid"
                value={editedLogType.description || ""}
                onChange={e => setEditedLogType(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="log-level">Log Level</Label>
              <Select
                value={editedLogType.level || "info"}
                onValueChange={(value) => setEditedLogType(prev => ({ 
                  ...prev, 
                  level: value as "success" | "error" | "warning" | "info" | "critical"
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select log level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingLogType(false)}>
              Cancel
            </Button>
            <Button onClick={saveLogType} disabled={!editedLogType.name || !editedLogType.pattern}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditingDisplay} onOpenChange={setIsEditingDisplay}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editedDisplay.id && config.logDisplays.some(ld => ld.id === editedDisplay.id) ? "Edit" : "Add"} Display Rule</DialogTitle>
            <DialogDescription>
              Configure where and how logs are displayed
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="display-logtype">Log Type</Label>
              <Select
                value={editedDisplay.logTypeId || ""}
                onValueChange={(value) => setEditedDisplay(prev => ({ ...prev, logTypeId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select log type" />
                </SelectTrigger>
                <SelectContent>
                  {config.logTypes.map(logType => (
                    <SelectItem key={logType.id} value={logType.id}>
                      {logType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Display Locations</Label>
              <div className="bg-background border rounded-md p-2 mt-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="location-all"
                    checked={editedDisplay.location === "all"}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setEditedDisplay(prev => ({ ...prev, location: "all" }));
                      } else {
                        setEditedDisplay(prev => ({ ...prev, location: [] }));
                      }
                    }}
                  />
                  <label
                    htmlFor="location-all"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    All Pages
                  </label>
                </div>
                
                {editedDisplay.location !== "all" && appLocations
                  .filter(loc => loc.id !== "all")
                  .map(location => (
                    <div key={location.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`location-${location.id}`}
                        checked={
                          Array.isArray(editedDisplay.location) && 
                          editedDisplay.location.includes(location.id)
                        }
                        onCheckedChange={(checked) => {
                          setEditedDisplay(prev => {
                            if (!Array.isArray(prev.location)) {
                              return { ...prev, location: checked ? [location.id] : [] };
                            }
                            
                            if (checked) {
                              return { 
                                ...prev, 
                                location: [...prev.location, location.id] 
                              };
                            } else {
                              return { 
                                ...prev, 
                                location: prev.location.filter(loc => loc !== location.id) 
                              };
                            }
                          });
                        }}
                      />
                      <label
                        htmlFor={`location-${location.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {location.name}
                      </label>
                    </div>
                  ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-notification"
                checked={editedDisplay.showNotification || false}
                onCheckedChange={(checked) => setEditedDisplay(prev => ({ 
                  ...prev, 
                  showNotification: !!checked
                }))}
              />
              <label
                htmlFor="show-notification"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Show Notification
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-in-card"
                checked={editedDisplay.showInCard || false}
                onCheckedChange={(checked) => setEditedDisplay(prev => ({ 
                  ...prev, 
                  showInCard: !!checked
                }))}
              />
              <label
                htmlFor="show-in-card"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Show In Card
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="trigger-stat"
                checked={editedDisplay.triggerStatUpdate || false}
                onCheckedChange={(checked) => setEditedDisplay(prev => ({ 
                  ...prev, 
                  triggerStatUpdate: !!checked
                }))}
              />
              <label
                htmlFor="trigger-stat"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Update Statistics
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingDisplay(false)}>
              Cancel
            </Button>
            <Button onClick={saveDisplayRule} disabled={!editedDisplay.logTypeId || !editedDisplay.location}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Raw log dialog */}
      <Dialog open={!!selectedRawLog} onOpenChange={(open) => !open && setSelectedRawLog(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Raw Log Entry</DialogTitle>
            <DialogDescription>
              The complete unprocessed log entry
            </DialogDescription>
          </DialogHeader>
          
          <div className="border rounded-md p-4 font-mono text-xs overflow-x-auto whitespace-pre-wrap bg-muted/10">
            {selectedRawLog}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRawLog(null)}>
              Close
            </Button>
            <Button onClick={() => {
              if (selectedRawLog) {
                navigator.clipboard.writeText(selectedRawLog);
                showToast({
                  title: "Copied to clipboard",
                  description: "The raw log entry has been copied to your clipboard."
                });
              }
            }}>
              Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 