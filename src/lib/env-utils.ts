/**
 * Utility functions for handling TORRENT_FILTER_REGEX format detection and conversion
 */

export type RegexFormat = 'string' | 'array' | 'empty';

export interface ParsedRegexValue {
  format: RegexFormat;
  array: string[];
  raw: string;
  isValid: boolean;
  error?: string;
}

/**
 * Detects whether TORRENT_FILTER_REGEX value is a JSON array or single string
 */
export function detectRegexFormat(value: string | undefined | null): RegexFormat {
  if (!value || value.trim() === '') {
    return 'empty';
  }

  const trimmed = value.trim();
  
  // Check if it looks like JSON array
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return 'array';
      }
    } catch {
      // Invalid JSON, treat as string
    }
  }
  
  return 'string';
}

/**
 * Parses TORRENT_FILTER_REGEX value and returns structured object
 */
export function parseRegexValue(value: string | undefined | null): ParsedRegexValue {
  if (!value || value.trim() === '') {
    return {
      format: 'empty',
      array: [],
      raw: '',
      isValid: true
    };
  }

  const trimmed = value.trim();
  const format = detectRegexFormat(trimmed);

  if (format === 'array') {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        return {
          format: 'array',
          array: parsed,
          raw: trimmed,
          isValid: true
        };
      }
      return {
        format: 'array',
        array: [],
        raw: trimmed,
        isValid: false,
        error: 'Array contains non-string values'
      };
    } catch (error) {
      return {
        format: 'array',
        array: [],
        raw: trimmed,
        isValid: false,
        error: 'Invalid JSON format'
      };
    }
  }

  // String format
  return {
    format: 'string',
    array: [trimmed],
    raw: trimmed,
    isValid: validateRegexPattern(trimmed)
  };
}

/**
 * Converts a single string to regex array format
 */
export function stringToRegexArray(value: string): string[] {
  if (!value || value.trim() === '') {
    return [];
  }
  return [value.trim()];
}

/**
 * Converts regex array to JSON string format
 */
export function regexArrayToString(patterns: string[]): string {
  if (patterns.length === 0) {
    return '';
  }
  if (patterns.length === 1) {
    return patterns[0];
  }
  return JSON.stringify(patterns);
}

/**
 * Validates a single regex pattern
 */
export function validateRegexPattern(pattern: string): boolean {
  if (!pattern || pattern.trim() === '') {
    return false;
  }
  
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates an array of regex patterns
 */
export function validateRegexArray(patterns: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    if (!pattern || pattern.trim() === '') {
      errors.push(`Pattern ${i + 1}: Empty pattern`);
    } else if (!validateRegexPattern(pattern)) {
      errors.push(`Pattern ${i + 1}: Invalid regex syntax`);
    }
  }
  
  // Check for duplicates
  const seen = new Set<string>();
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i].trim();
    if (pattern && seen.has(pattern)) {
      errors.push(`Pattern ${i + 1}: Duplicate pattern "${pattern}"`);
    }
    seen.add(pattern);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Returns default regex patterns for new installations
 */
export function getDefaultRegexPatterns(): string[] {
  return [
    "1080p.*BluRay.*x264",
    "720p.*WEB-DL",
    "(720p|1080p).*"
  ];
}

/**
 * Finds matching preset for a single pattern
 */
export function findMatchingPreset(pattern: string, presets: { [key: string]: string }): string | null {
  for (const [name, presetPattern] of Object.entries(presets)) {
    if (presetPattern === pattern) {
      return name;
    }
  }
  return null;
}

/**
 * Finds matching presets for an array of patterns
 */
export function findMatchingPresets(patterns: string[], presets: { [key: string]: string }): string[] {
  return patterns.map(pattern => findMatchingPreset(pattern, presets) || '').filter(Boolean);
}

/**
 * Checks if current patterns match a known preset exactly
 */
export function getMatchingPresetName(patterns: string[], presets: { [key: string]: string }): string | null {
  if (patterns.length === 1) {
    return findMatchingPreset(patterns[0], presets);
  }
  
  // For multi-pattern arrays, could implement more complex matching logic
  // For now, return null if it's not a single pattern
  return null;
}