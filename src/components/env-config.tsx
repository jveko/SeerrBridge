"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Settings2Icon, 
  SaveIcon, 
  RefreshCwIcon, 
  AlertCircleIcon, 
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  ChevronDownIcon,
  GlobeIcon,
  XCircleIcon,
  PlusCircleIcon,
  TagIcon,
  EditIcon,
  Trash2Icon
} from "lucide-react";
import RegexBuilder from "./regex-builder";

// Available options for specific environment variables
const BOOLEAN_OPTIONS = [
  { value: "true", label: "True" },
  { value: "false", label: "False" },
];

const MOVIE_SIZE_OPTIONS = [
  { value: "0", label: "Biggest Size Possible" },
  { value: "1", label: "1 GB" },
  { value: "3", label: "3 GB" },
  { value: "5", label: "5 GB (Default)" },
  { value: "15", label: "15 GB" },
  { value: "30", label: "30 GB" },
  { value: "60", label: "60 GB" },
];

const EPISODE_SIZE_OPTIONS = [
  { value: "0", label: "Biggest Size Possible" },
  { value: "0.1", label: "100 MB" },
  { value: "0.3", label: "300 MB" },
  { value: "0.5", label: "500 MB" },
  { value: "1", label: "1 GB (Default)" },
  { value: "3", label: "3 GB" },
  { value: "5", label: "5 GB" },
];

// Type for regex presets
type RegexPreset = {
  id: string;
  name: string;
  pattern: string;
  isDefault: boolean;
  description?: string;
};

// Value validation statuses
type ValidationStatus = {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  code?: number;
};

export function EnvConfig() {
  const router = useRouter();
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleValues, setVisibleValues] = useState<Record<string, boolean>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [validationStatus, setValidationStatus] = useState<Record<string, ValidationStatus>>({
    OVERSEERR_BASE: { status: 'idle' }
  });
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [regexPresets, setRegexPresets] = useState<RegexPreset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [showAddPreset, setShowAddPreset] = useState(false);
  const [editingPreset, setEditingPreset] = useState<RegexPreset | null>(null);
  const [newPreset, setNewPreset] = useState<{
    name: string;
    pattern: string;
    description?: string;
  }>({ name: '', pattern: '' });
  const ITEMS_PER_PAGE = 5;

  // Function to set dropdown refs
  const setDropdownRef = (key: string, element: HTMLDivElement | null) => {
    dropdownRefs.current[key] = element;
  };

  // Load environment variables
  useEffect(() => {
    async function fetchEnvVars() {
      try {
        setLoading(true);
        const response = await fetch("/api/env");
        if (!response.ok) {
          throw new Error("Failed to fetch environment variables");
        }
        const data = await response.json();
        setEnvVars(data);
        setError(null);
        
        // Initialize validation for OVERSEERR_BASE if it exists
        if (data.OVERSEERR_BASE) {
          validateOverseerrConnection(data.OVERSEERR_BASE);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchEnvVars();
    
    // Set up refresh timer
    const interval = setInterval(() => {
      fetchEnvVars();
    }, 30000); // 30 seconds
    
    return () => {
      clearInterval(interval);
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  // Load regex presets
  useEffect(() => {
    async function fetchRegexPresets() {
      try {
        setLoadingPresets(true);
        const response = await fetch("/api/regex-presets");
        if (!response.ok) {
          throw new Error("Failed to fetch regex presets");
        }
        const data = await response.json();
        setRegexPresets(data.presets || []);
      } catch (err) {
        console.error("Error loading regex presets:", err);
        // Don't set main error as this is non-critical
      } finally {
        setLoadingPresets(false);
      }
    }

    fetchRegexPresets();
  }, []);

  // Handle saving new/updated preset from regular form
  const handleSavePreset = async () => {
    if (!newPreset.name.trim() || !newPreset.pattern.trim()) {
      return; // Don't submit if empty
    }

    await savePreset(
      newPreset.name, 
      newPreset.pattern, 
      newPreset.description, 
      editingPreset?.id
    );
    
    // Clear form and close edit mode
    setNewPreset({ name: '', pattern: '' });
    setEditingPreset(null);
    setShowAddPreset(false);

    // If we're editing the current selection, update it
    if (editingPreset && envVars.TORRENT_FILTER_REGEX === editingPreset.pattern) {
      handleInputChange('TORRENT_FILTER_REGEX', newPreset.pattern);
    }
  };

  // Handle saving a new preset from the builder
  const handleSaveBuilderPreset = async (name: string, pattern: string, description?: string) => {
    await savePreset(name, pattern, description);
  };

  // Common save preset logic
  const savePreset = async (
    name: string, 
    pattern: string, 
    description?: string, 
    existingId?: string
  ) => {
    try {
      const presetId = existingId || `custom-${Date.now()}`;
      
      const response = await fetch("/api/regex-presets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          preset: {
            id: presetId,
            name,
            pattern,
            description
          }
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save preset");
      }

      const data = await response.json();
      setRegexPresets(data.presets);
      return true;
    } catch (err) {
      console.error("Error saving regex preset:", err);
      return false;
    }
  };

  // Handle deleting a preset
  const handleDeletePreset = async (id: string) => {
    try {
      const response = await fetch(`/api/regex-presets?id=${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Failed to delete preset");
      }

      const data = await response.json();
      setRegexPresets(data.presets);
    } catch (err) {
      console.error("Error deleting regex preset:", err);
    }
  };

  // Handle editing a preset
  const handleEditPreset = (preset: RegexPreset) => {
    setEditingPreset(preset);
    setNewPreset({
      name: preset.name,
      pattern: preset.pattern,
      description: preset.description
    });
    setShowAddPreset(true);
  };

  // Apply a preset to the TORRENT_FILTER_REGEX field
  const applyRegexPreset = (pattern: string) => {
    handleInputChange('TORRENT_FILTER_REGEX', pattern);
  };

  // Validate OVERSEERR_BASE connection
  const validateOverseerrConnection = async (url: string) => {
    // Don't validate empty URLs
    if (!url.trim()) {
      setValidationStatus(prev => ({
        ...prev,
        OVERSEERR_BASE: { status: 'idle' }
      }));
      return;
    }
    
    // Set loading state
    setValidationStatus(prev => ({
      ...prev,
      OVERSEERR_BASE: { status: 'loading' }
    }));
    
    try {
      // Ensure URL has protocol
      let validateUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        validateUrl = `http://${url}`;
      }
      
      // Make sure URL ends with /
      if (!validateUrl.endsWith('/')) {
        validateUrl = `${validateUrl}/`;
      }
      
      const response = await fetch(`/api/validate-url?url=${encodeURIComponent(validateUrl)}`);
      const data = await response.json();
      
      if (response.ok && data.status === 200) {
        setValidationStatus(prev => ({
          ...prev,
          OVERSEERR_BASE: { 
            status: 'success', 
            message: 'Connection successful',
            code: data.status
          }
        }));
      } else {
        setValidationStatus(prev => ({
          ...prev,
          OVERSEERR_BASE: { 
            status: 'error', 
            message: data.message || 'Failed to connect to Overseerr',
            code: data.status
          }
        }));
      }
    } catch (err) {
      setValidationStatus(prev => ({
        ...prev,
        OVERSEERR_BASE: { 
          status: 'error', 
          message: err instanceof Error ? err.message : 'Connection error',
        }
      }));
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const dropdownElement = dropdownRefs.current[openDropdown];
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const handleInputChange = (key: string, value: string) => {
    setEnvVars(prev => ({
      ...prev,
      [key]: value
    }));
    
    // If this is OVERSEERR_BASE, schedule validation after typing stops
    if (key === 'OVERSEERR_BASE') {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      
      validationTimeoutRef.current = setTimeout(() => {
        validateOverseerrConnection(value);
      }, 800); // Debounce validation for 800ms
    }
  };

  const toggleValueVisibility = (key: string) => {
    setVisibleValues(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleDropdown = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    setOpenDropdown(openDropdown === key ? null : key);
  };

  const selectOption = (e: React.MouseEvent, key: string, value: string) => {
    e.stopPropagation();
    handleInputChange(key, value);
    setOpenDropdown(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccess(null);
      setError(null);
      
      const response = await fetch("/api/env", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(envVars)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save environment variables");
      }
      
      setSuccess("Environment variables saved successfully. You must restart SeerrBridge to apply the changes.");
      
      // Refresh the page to apply the changes
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setSaving(false);
    }
  };

  // Calculate pagination values
  const envVarEntries = Object.entries(envVars);
  const totalPages = Math.ceil(envVarEntries.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEnvVars = envVarEntries.slice(startIndex, endIndex);

  // Pagination handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  useEffect(() => {
    // Reset to first page when env vars list changes
    setCurrentPage(1);
  }, [Object.keys(envVars).length]);

  // Check if a value is sensitive (contains token, key, password, etc.)
  const isSensitiveValue = (key: string): boolean => {
    const sensitiveTerms = ['token', 'key', 'password', 'secret', 'auth', 'credential'];
    return sensitiveTerms.some(term => key.toLowerCase().includes(term));
  };
   
  // Determine if a variable should use a dropdown and which options
  const getDropdownOptions = (key: string) => {
    // Boolean variables
    if (
      key === "HEADLESS_MODE" || 
      key === "ENABLE_AUTOMATIC_BACKGROUND_TASK" || 
      key === "ENABLE_SHOW_SUBSCRIPTION_TASK"
    ) {
      return BOOLEAN_OPTIONS;
    }
    
    // Size limit variables
    if (key === "MAX_MOVIE_SIZE") {
      return MOVIE_SIZE_OPTIONS;
    }
    
    if (key === "MAX_EPISODE_SIZE") {
      return EPISODE_SIZE_OPTIONS;
    }
    
    // Not a dropdown variable
    return null;
  };

  // Get the display label for a dropdown value
  const getDisplayLabel = (key: string, value: string) => {
    const options = getDropdownOptions(key);
    if (!options) return value;
    
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  // Determine dropdown open direction based on position in the list
  const shouldOpenUpward = (index: number, total: number) => {
    // Open upward for the last 2 items in the list
    return index >= total - 2;
  };

  // Manually check OVERSEERR_BASE connection
  const handleCheckConnection = (e: React.MouseEvent) => {
    e.preventDefault();
    if (envVars.OVERSEERR_BASE) {
      validateOverseerrConnection(envVars.OVERSEERR_BASE);
    }
  };

  // Check if a key is the regex filter variable
  const isRegexVariable = (key: string): boolean => {
    return key === 'TORRENT_FILTER_REGEX';
  };

  // Find current preset name if pattern matches
  const getCurrentPresetName = (): string | null => {
    if (!envVars.TORRENT_FILTER_REGEX) return null;
    
    const matchingPreset = regexPresets.find(
      preset => preset.pattern === envVars.TORRENT_FILTER_REGEX
    );
    
    return matchingPreset ? matchingPreset.name : null;
  };

  return (
    <div className="glass-card h-full flex flex-col">
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center mb-1">
          <h2 className="text-xl font-semibold flex items-center">
            <Settings2Icon size={20} className="mr-2 text-primary" />
            Environment Configuration
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Edit your SeerrBridge environment variables
        </p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <RefreshCwIcon size={36} className="text-primary/60 animate-spin mb-3" />
            <p className="text-muted-foreground">Loading environment variables...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <AlertCircleIcon size={36} className="text-destructive mb-3" />
            <p className="text-destructive font-medium mb-2">{error}</p>
            <button
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md transition-all hover:bg-primary/90"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="flex-1 p-5 space-y-4 overflow-auto">
              {paginatedEnvVars.map(([key, value], index) => {
                const isSensitive = isSensitiveValue(key);
                const isVisible = visibleValues[key] || false;
                const dropdownOptions = getDropdownOptions(key);
                const isDropdownOpen = openDropdown === key;
                const openUpward = shouldOpenUpward(index, paginatedEnvVars.length);
                const isOverseerrBase = key === 'OVERSEERR_BASE';
                const validation = isOverseerrBase ? validationStatus.OVERSEERR_BASE : undefined;
                const isRegexFilter = isRegexVariable(key);
                const currentPresetName = isRegexFilter ? getCurrentPresetName() : null;
                
                return (
                  <div key={key} className="group">
                    <label 
                      htmlFor={key} 
                      className="text-sm font-medium mb-1.5 block group-hover:text-primary transition-colors"
                    >
                      {key}
                      {isRegexFilter && currentPresetName && (
                        <span className="ml-2 text-xs rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                          {currentPresetName}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      {dropdownOptions ? (
                        <div 
                          className="relative" 
                          ref={(el) => setDropdownRef(key, el)}
                        >
                          <div 
                            className="glass-input w-full px-3 py-2 rounded-md flex justify-between items-center cursor-pointer hover:border-primary/50 hover:shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all"
                            onClick={(e) => toggleDropdown(e, key)}
                          >
                            <span className={`${key.includes("ENABLE") || key === "HEADLESS_MODE" ? (value === "true" ? "text-green-400" : "text-red-400") : ""}`}>
                              {getDisplayLabel(key, value)}
                            </span>
                            <ChevronDownIcon 
                              size={18} 
                              className={`text-primary/70 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                            />
                          </div>
                          
                          {isDropdownOpen && (
                            <div 
                              className={`absolute z-50 w-full ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'} bg-background/95 backdrop-blur-md border border-border/30 rounded-md shadow-lg shadow-primary/20`}
                            >
                              <div 
                                className="py-1 max-h-[200px] overflow-y-auto custom-scrollbar"
                                style={{
                                  scrollbarWidth: 'thin',
                                  scrollbarColor: 'rgba(139, 92, 246, 0.3) transparent'
                                }}
                              >
                                {dropdownOptions.map((option) => (
                                  <div
                                    key={option.value}
                                    className={`px-3 py-2 cursor-pointer ${value === option.value ? 'bg-primary/20 text-primary' : 'hover:bg-primary/10'} transition-colors`}
                                    onClick={(e) => selectOption(e, key, option.value)}
                                  >
                                    {option.label}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="flex">
                            <input
                              type={isSensitive && !isVisible ? "password" : "text"}
                              id={key}
                              value={value}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              className={`glass-input w-full px-3 py-2 rounded-md focus:outline-none focus:border-primary/50 focus:shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all ${isOverseerrBase ? 'rounded-r-none' : (isSensitive ? 'pr-10' : '')}`}
                            />
                            {isOverseerrBase && (
                              <button
                                type="button"
                                onClick={handleCheckConnection}
                                className={`px-3 flex items-center rounded-r-md border-l-0 transition-colors ${
                                  validation?.status === 'success' 
                                    ? 'bg-success/20 text-success border-success/30' 
                                    : validation?.status === 'error'
                                    ? 'bg-destructive/20 text-destructive border-destructive/30'
                                    : 'bg-primary/20 text-primary border-primary/30'
                                }`}
                                title="Check Overseerr connection"
                              >
                                {validation?.status === 'loading' ? (
                                  <RefreshCwIcon size={18} className="animate-spin" />
                                ) : validation?.status === 'success' ? (
                                  <CheckCircleIcon size={18} />
                                ) : validation?.status === 'error' ? (
                                  <XCircleIcon size={18} />
                                ) : (
                                  <GlobeIcon size={18} />
                                )}
                              </button>
                            )}
                            {isSensitive && (
                              <button
                                type="button"
                                onClick={() => toggleValueVisibility(key)}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                aria-label={isVisible ? "Hide value" : "Show value"}
                              >
                                {isVisible ? (
                                  <EyeOffIcon size={16} />
                                ) : (
                                  <EyeIcon size={16} />
                                )}
                              </button>
                            )}
                          </div>
                          
                          {isOverseerrBase && validation?.status !== 'idle' && (
                            <div className={`mt-1 text-xs px-2 py-1 rounded ${
                              validation?.status === 'success' 
                                ? 'bg-success/10 text-success' 
                                : validation?.status === 'error'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-muted/30 text-muted-foreground'
                            }`}>
                              {validation?.status === 'loading' ? (
                                <span className="flex items-center">
                                  <RefreshCwIcon size={12} className="animate-spin mr-1" />
                                  Checking connection...
                                </span>
                              ) : validation?.status === 'success' ? (
                                <span className="flex items-center">
                                  <CheckCircleIcon size={12} className="mr-1" />
                                  {validation.message} {validation.code && `(${validation.code})`}
                                </span>
                              ) : validation?.status === 'error' ? (
                                <span className="flex items-center">
                                  <XCircleIcon size={12} className="mr-1" />
                                  {validation.message || 'Connection failed'} {validation.code && `(${validation.code})`}
                                  <span className="ml-1 opacity-80">- Check if your Overseerr is running</span>
                                </span>
                              ) : null}
                            </div>
                          )}

                          {isRegexFilter && (
                            <div className="mt-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground flex items-center">
                                  <TagIcon size={14} className="mr-1" />
                                  Regex Presets
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPreset(null);
                                    setNewPreset({ name: '', pattern: '' });
                                    setShowAddPreset(!showAddPreset); 
                                  }}
                                  className="text-xs px-2 py-1 rounded-md flex items-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                >
                                  <PlusCircleIcon size={14} className="mr-1" />
                                  {showAddPreset ? 'Cancel' : 'Add Custom Preset'}
                                </button>
                              </div>

                              {showAddPreset && (
                                <div className="glass-card p-3 rounded-md space-y-2 bg-background/50">
                                  <h4 className="text-sm font-medium mb-2">
                                    {editingPreset ? 'Edit Preset' : 'Add Custom Preset'}
                                  </h4>
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={newPreset.name}
                                      onChange={(e) => setNewPreset(prev => ({ ...prev, name: e.target.value }))}
                                      placeholder="Preset Name"
                                      className="glass-input w-full px-3 py-1.5 text-sm rounded-md focus:outline-none focus:border-primary/50 focus:shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all"
                                    />
                                    <textarea
                                      value={newPreset.pattern}
                                      onChange={(e) => setNewPreset(prev => ({ ...prev, pattern: e.target.value }))}
                                      placeholder="Regex Pattern"
                                      className="glass-input w-full px-3 py-1.5 text-sm rounded-md focus:outline-none focus:border-primary/50 focus:shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all min-h-[60px]"
                                    />
                                    <input
                                      type="text"
                                      value={newPreset.description || ''}
                                      onChange={(e) => setNewPreset(prev => ({ ...prev, description: e.target.value }))}
                                      placeholder="Description (optional)"
                                      className="glass-input w-full px-3 py-1.5 text-sm rounded-md focus:outline-none focus:border-primary/50 focus:shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all"
                                    />
                                    <div className="flex justify-end pt-1">
                                      <button
                                        type="button"
                                        onClick={handleSavePreset}
                                        disabled={!newPreset.name || !newPreset.pattern}
                                        className="bg-primary/80 hover:bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm transition-colors flex items-center disabled:opacity-50 disabled:pointer-events-none"
                                      >
                                        <SaveIcon size={14} className="mr-1" />
                                        Save Preset
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {loadingPresets ? (
                                <div className="flex justify-center py-2">
                                  <RefreshCwIcon size={16} className="text-primary/60 animate-spin" />
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {regexPresets.map((preset) => (
                                    <div 
                                      key={preset.id}
                                      className={`
                                        group/preset px-3 py-1.5 rounded-lg flex items-center justify-between max-w-full border border-border/30
                                        ${preset.pattern === value ? 'bg-primary/20 border-primary/40' : 'bg-background/40 hover:bg-background/70'}
                                        transition-colors cursor-pointer relative
                                      `}
                                      title={preset.description}
                                      onClick={() => applyRegexPreset(preset.pattern)}
                                    >
                                      <div className="overflow-hidden text-ellipsis whitespace-nowrap mr-1.5 text-sm">
                                        {preset.name}
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 group-hover/preset:opacity-100 transition-opacity">
                                        {!preset.isDefault && (
                                          <>
                                            <button
                                              type="button"
                                              className="p-1 rounded-full hover:bg-background/60 text-muted-foreground hover:text-primary transition-colors"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditPreset(preset);
                                              }}
                                            >
                                              <EditIcon size={14} />
                                            </button>
                                            <button
                                              type="button"
                                              className="p-1 rounded-full hover:bg-background/60 text-muted-foreground hover:text-destructive transition-colors"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeletePreset(preset.id);
                                              }}
                                            >
                                              <Trash2Icon size={14} />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Regex Builder Component */}
                              <RegexBuilder
                                onSavePattern={handleSaveBuilderPreset}
                                onApplyPattern={applyRegexPreset}
                                isLoading={loadingPresets}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {totalPages > 1 && (
              <div className="p-4 pt-1 flex items-center justify-center border-t border-border/20">
                <div className="flex items-center space-x-2">
                  <button 
                    type="button"
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className={`p-1 rounded-full ${currentPage === 1 ? 'text-muted-foreground' : 'hover:bg-primary/10 text-primary'}`}
                    aria-label="Previous page"
                  >
                    <ChevronLeftIcon size={20} />
                  </button>
                  
                  <span className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button 
                    type="button"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className={`p-1 rounded-full ${currentPage === totalPages ? 'text-muted-foreground' : 'hover:bg-primary/10 text-primary'}`}
                    aria-label="Next page"
                  >
                    <ChevronRightIcon size={20} />
                  </button>
                </div>
              </div>
            )}
            
            {success && (
              <div className="px-5 py-3 flex items-center space-x-2 border-t border-success/20 bg-success/5 text-success">
                <CheckCircleIcon size={16} />
                <span>{success}</span>
              </div>
            )}
            
            <div className="p-4 border-t border-border/50 flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Auto-refreshes every 30 seconds</p>
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors flex items-center"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <RefreshCwIcon size={16} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <SaveIcon size={16} className="mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 