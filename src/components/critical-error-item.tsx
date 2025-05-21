"use client";

import { useState } from "react";
import { type MediaItem } from "@/lib/utils";
import {
  AlertTriangleIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FilmIcon,
  TvIcon
} from "lucide-react";

interface CriticalErrorItemProps {
  error: MediaItem;
  formattedDate: string;
}

// Client component for expandable error details
export default function CriticalErrorItem({ error, formattedDate }: CriticalErrorItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="glass-card overflow-hidden group hover:shadow-lg transition-all duration-300">
      <div className="p-5 border-b border-border/50 flex items-start">
        <div className="mr-4 mt-1">
          {error.type === "tv" ? (
            <TvIcon size={24} className="text-destructive" />
          ) : (
            <FilmIcon size={24} className="text-destructive" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-medium">
            {error.title}
          </h3>
          <div className="text-xs text-muted-foreground mt-1 flex items-center">
            <span className="flex items-center">
              <ClockIcon size={12} className="mr-1" />
              {formattedDate}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-muted rounded-full transition-colors"
          aria-label={isExpanded ? "Collapse error details" : "Expand error details"}
        >
          {isExpanded ? (
            <ChevronUpIcon size={18} className="text-muted-foreground" />
          ) : (
            <ChevronDownIcon size={18} className="text-muted-foreground" />
          )}
        </button>
      </div>
      <div className="p-4 bg-destructive/5">
        <div className="flex items-center text-sm">
          <AlertTriangleIcon size={14} className="mr-2 text-destructive" />
          <span className="text-destructive">{error.message}</span>
        </div>
      </div>
      {isExpanded && error.detailedError && (
        <div className="p-4 bg-muted/50 border-t border-border/50 overflow-x-auto">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
            {error.detailedError}
          </pre>
        </div>
      )}
    </div>
  );
} 