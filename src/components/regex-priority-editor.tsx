"use client";

import { useState } from "react";
import { 
  ChevronUpIcon, 
  ChevronDownIcon, 
  XCircleIcon, 
  PlusCircleIcon,
  AlertCircleIcon,
  CheckCircleIcon
} from "lucide-react";

interface RegexPriorityEditorProps {
  patterns: string[];
  onPatternsChange: (patterns: string[]) => void;
  presets?: { [key: string]: string };
  onApplyPreset?: (preset: string) => void;
  onSavePreset?: (name: string, pattern: string) => void;
  isLoading?: boolean;
}

export default function RegexPriorityEditor({
  patterns,
  onPatternsChange,
  presets = {},
  onApplyPreset,
  onSavePreset,
  isLoading = false
}: RegexPriorityEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [errors, setErrors] = useState<{ [key: number]: string }>({});

  const validatePattern = (pattern: string): string | null => {
    if (!pattern || pattern.trim() === "") {
      return "Pattern cannot be empty";
    }
    
    try {
      new RegExp(pattern);
      return null;
    } catch {
      return "Invalid regex syntax";
    }
  };

  const checkDuplicates = (newPatterns: string[]): { [key: number]: string } => {
    const duplicateErrors: { [key: number]: string } = {};
    const seen = new Set<string>();
    
    newPatterns.forEach((pattern, index) => {
      const trimmed = pattern.trim();
      if (trimmed && seen.has(trimmed)) {
        duplicateErrors[index] = "Duplicate pattern";
      }
      seen.add(trimmed);
    });
    
    return duplicateErrors;
  };

  const updatePatterns = (newPatterns: string[]) => {
    const newErrors: { [key: number]: string } = {};
    
    // Validate each pattern
    newPatterns.forEach((pattern, index) => {
      const error = validatePattern(pattern);
      if (error) {
        newErrors[index] = error;
      }
    });
    
    // Check for duplicates
    const duplicateErrors = checkDuplicates(newPatterns);
    Object.assign(newErrors, duplicateErrors);
    
    setErrors(newErrors);
    onPatternsChange(newPatterns);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(patterns[index] || "");
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null) {
      const newPatterns = [...patterns];
      newPatterns[editingIndex] = editingValue;
      updatePatterns(newPatterns);
      setEditingIndex(null);
      setEditingValue("");
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const newPatterns = [...patterns];
      [newPatterns[index], newPatterns[index - 1]] = [newPatterns[index - 1], newPatterns[index]];
      updatePatterns(newPatterns);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < patterns.length - 1) {
      const newPatterns = [...patterns];
      [newPatterns[index], newPatterns[index + 1]] = [newPatterns[index + 1], newPatterns[index]];
      updatePatterns(newPatterns);
    }
  };

  const handleRemove = (index: number) => {
    const newPatterns = patterns.filter((_, i) => i !== index);
    updatePatterns(newPatterns);
  };

  const handleAdd = () => {
    const newPatterns = [...patterns, ""];
    updatePatterns(newPatterns);
    setEditingIndex(patterns.length);
    setEditingValue("");
  };

  const handleApplyPreset = (presetName: string, index?: number) => {
    const presetValue = presets[presetName];
    if (!presetValue) return;

    if (typeof index === 'number') {
      // Apply to specific position
      const newPatterns = [...patterns];
      newPatterns[index] = presetValue;
      updatePatterns(newPatterns);
    } else {
      // Apply as single pattern (replace all)
      updatePatterns([presetValue]);
    }
  };

  const handleInsertPreset = (presetName: string, afterIndex: number) => {
    const presetValue = presets[presetName];
    if (!presetValue) return;

    const newPatterns = [...patterns];
    newPatterns.splice(afterIndex + 1, 0, presetValue);
    updatePatterns(newPatterns);
  };

  const getPriorityLabel = (index: number): string => {
    const suffixes = ['st', 'nd', 'rd'];
    const priority = index + 1;
    const suffix = priority <= 3 ? suffixes[priority - 1] : 'th';
    return `${priority}${suffix}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Priority-Based Regex Patterns
        </h3>
        <button
          onClick={handleAdd}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <PlusCircleIcon className="w-4 h-4" />
          Add Pattern
        </button>
      </div>

      <div className="text-sm text-gray-400 mb-4">
        Patterns are evaluated in order of priority. The first matching pattern determines the torrent&apos;s priority.
      </div>

      {patterns.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <div className="text-gray-400 mb-4">No regex patterns configured</div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
          >
            <PlusCircleIcon className="w-4 h-4" />
            Add First Pattern
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {patterns.map((pattern, index) => (
            <div key={index} className="glass-card p-4">
              <div className="flex items-center gap-3">
                {/* Priority indicator */}
                <div className="flex-shrink-0 w-12 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm font-semibold text-white">
                  {getPriorityLabel(index)}
                </div>

                {/* Pattern content */}
                <div className="flex-grow">
                  {editingIndex === index ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="glass-input w-full"
                        placeholder="Enter regex pattern..."
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="cursor-pointer hover:bg-white/5 p-2 rounded transition-colors"
                      onClick={() => handleEdit(index)}
                    >
                      <div className="font-mono text-sm text-gray-200">
                        {pattern || <span className="text-gray-500 italic">Empty pattern</span>}
                      </div>
                      {errors[index] && (
                        <div className="flex items-center gap-1 mt-1 text-red-400 text-xs">
                          <AlertCircleIcon className="w-3 h-3" />
                          {errors[index]}
                        </div>
                      )}
                      {!errors[index] && pattern && (
                        <div className="flex items-center gap-1 mt-1 text-green-400 text-xs">
                          <CheckCircleIcon className="w-3 h-3" />
                          Valid pattern
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {editingIndex !== index && (
                    <>
                      {/* Move up/down buttons */}
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0 || isLoading}
                        className="p-1 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                        title="Move up"
                      >
                        <ChevronUpIcon className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === patterns.length - 1 || isLoading}
                        className="p-1 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                        title="Move down"
                      >
                        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                      </button>

                      {/* Remove button */}
                      <button
                        onClick={() => handleRemove(index)}
                        disabled={isLoading}
                        className="p-1 hover:bg-red-600/20 text-red-400 rounded transition-colors"
                        title="Remove pattern"
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Preset integration */}
              {Object.keys(presets).length > 0 && editingIndex !== index && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex gap-2 text-xs">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleApplyPreset(e.target.value, index);
                          e.target.value = "";
                        }
                      }}
                      className="bg-gray-700 text-white rounded px-2 py-1 text-xs"
                      defaultValue=""
                    >
                      <option value="">Apply Preset</option>
                      {Object.keys(presets).map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleInsertPreset(e.target.value, index);
                          e.target.value = "";
                        }
                      }}
                      className="bg-gray-700 text-white rounded px-2 py-1 text-xs"
                      defaultValue=""
                    >
                      <option value="">Insert After</option>
                      {Object.keys(presets).map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}