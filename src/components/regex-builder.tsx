"use client";

import { useState, useEffect } from 'react';
import { 
  PlusCircleIcon, 
  SaveIcon, 
  RefreshCwIcon,
  WandIcon,
  XIcon
} from 'lucide-react';
import { 
  REGEX_BUILDER_CATEGORIES, 
  RegexBuilderCategory,
  generateRegexFromOptions 
} from './regex-builder-options';

type RegexBuilderProps = {
  onSavePattern: (name: string, pattern: string, description?: string) => void;
  onApplyPattern: (pattern: string) => void;
  isLoading?: boolean;
};

export default function RegexBuilder({ 
  onSavePattern, 
  onApplyPattern,
  isLoading = false 
}: RegexBuilderProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [generatedPattern, setGeneratedPattern] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  
  // Initialize empty arrays for each category
  useEffect(() => {
    const initialSelections: Record<string, string[]> = {};
    REGEX_BUILDER_CATEGORIES.forEach(category => {
      initialSelections[category.id] = [];
    });
    setSelectedOptions(initialSelections);
  }, []);
  
  // Generate pattern when selections change
  useEffect(() => {
    const pattern = generateRegexFromOptions(selectedOptions);
    setGeneratedPattern(pattern);
  }, [selectedOptions]);
  
  // Toggle an option selection
  const toggleOption = (categoryId: string, value: string) => {
    setSelectedOptions(prev => {
      const newState = { ...prev };
      
      if (newState[categoryId].includes(value)) {
        // Remove if already selected
        newState[categoryId] = newState[categoryId].filter(val => val !== value);
      } else {
        // Add if not selected
        newState[categoryId] = [...newState[categoryId], value];
      }
      
      return newState;
    });
  };
  
  // Check if an option is selected
  const isOptionSelected = (categoryId: string, value: string): boolean => {
    return selectedOptions[categoryId]?.includes(value) || false;
  };
  
  // Handle saving the generated pattern
  const handleSavePattern = () => {
    if (!newPresetName.trim()) return;
    
    onSavePattern(
      newPresetName.trim(),
      generatedPattern,
      newPresetDescription.trim() || undefined
    );
    
    // Reset form
    setNewPresetName('');
    setNewPresetDescription('');
    setShowSaveForm(false);
  };
  
  // Apply the generated pattern
  const handleApplyPattern = () => {
    onApplyPattern(generatedPattern);
  };
  
  // Reset all selections
  const resetSelections = () => {
    const resetState: Record<string, string[]> = {};
    REGEX_BUILDER_CATEGORIES.forEach(category => {
      resetState[category.id] = [];
    });
    setSelectedOptions(resetState);
  };
  
  if (isLoading) {
    return (
      <div className="mt-6 flex justify-center">
        <RefreshCwIcon size={20} className="text-primary/60 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="mt-4 bg-background/30 rounded-lg border border-border/30 overflow-hidden">
      <div 
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-background/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-2">
          <WandIcon size={16} className="text-primary" />
          <h3 className="text-sm font-medium">Regex Pattern Builder</h3>
        </div>
        
        <div className="flex items-center gap-1">
          {!expanded ? (
            <span className="text-xs text-muted-foreground">
              Click to build a custom pattern
            </span>
          ) : null}
          
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          >
            <path 
              d="M6 9L12 15L18 9" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </svg>
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 border-t border-border/30 space-y-4">
          {/* Categories and options */}
          <div className="space-y-4">
            {REGEX_BUILDER_CATEGORIES.map((category) => (
              <div key={category.id} className="space-y-2">
                <h4 className="text-sm font-medium">{category.name}</h4>
                <div className="flex flex-wrap gap-2">
                  {category.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleOption(category.id, option.value)}
                      className={`
                        px-2.5 py-1 rounded-full text-xs flex items-center transition-colors
                        ${isOptionSelected(category.id, option.value) 
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'bg-background/50 hover:bg-background/70 border border-border/30'}
                      `}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Pattern preview and actions */}
          <div className="space-y-3 pt-2 border-t border-border/30">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Generated Pattern</h4>
                <button
                  type="button"
                  onClick={resetSelections}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center"
                >
                  <RefreshCwIcon size={12} className="mr-1" />
                  Reset
                </button>
              </div>
              <pre className="p-2 bg-background/50 rounded-md text-xs overflow-x-auto border border-border/30">
                {generatedPattern}
              </pre>
            </div>
            
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowSaveForm(!showSaveForm)}
                className="px-2.5 py-1.5 bg-background/50 text-xs flex items-center rounded-md hover:bg-background/70 border border-border/30 transition-colors"
              >
                {showSaveForm ? (
                  <>
                    <XIcon size={14} className="mr-1" />
                    Cancel
                  </>
                ) : (
                  <>
                    <SaveIcon size={14} className="mr-1" />
                    Save as Preset
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={handleApplyPattern}
                className="px-2.5 py-1.5 bg-primary/80 hover:bg-primary text-primary-foreground text-xs rounded-md transition-colors flex items-center"
              >
                <WandIcon size={14} className="mr-1" />
                Apply Pattern
              </button>
            </div>
          </div>
          
          {/* Save form */}
          {showSaveForm && (
            <div className="pt-3 border-t border-border/30 space-y-3">
              <h4 className="text-sm font-medium">Save as Preset</h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Preset Name"
                  className="glass-input w-full px-3 py-1.5 text-sm rounded-md focus:outline-none focus:border-primary/50 focus:shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all"
                />
                <input
                  type="text"
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="glass-input w-full px-3 py-1.5 text-sm rounded-md focus:outline-none focus:border-primary/50 focus:shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSavePattern}
                    disabled={!newPresetName.trim()}
                    className="bg-primary/80 hover:bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm transition-colors flex items-center disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <SaveIcon size={14} className="mr-1" />
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 