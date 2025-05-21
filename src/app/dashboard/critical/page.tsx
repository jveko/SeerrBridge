"use client";

import { Suspense, useState, useEffect } from "react";
import { type MediaItem, type LogEntry, formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeftIcon,
  AlertTriangleIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FilmIcon,
  TvIcon
} from "lucide-react";
import CriticalErrorItem from "@/components/critical-error-item";
import { Pagination } from "@/components/pagination";

// Constants
const ITEMS_PER_PAGE = 25;

// Extended LogEntry type to include rawLine
interface ExtendedLogEntry extends LogEntry {
  rawLine?: string;
}

export default function CriticalErrorsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Link 
        href="/dashboard" 
        className="flex items-center text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeftIcon size={16} className="mr-2" />
        Back to Dashboard
      </Link>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Critical System Errors</h1>
        <p className="text-muted-foreground mt-2">
          These errors require your attention and may affect system operation
        </p>
      </div>
      
      <div className="mt-8">
        <Suspense fallback={<div className="glass-card p-8 text-center">Loading critical errors...</div>}>
          <CriticalErrorsList />
        </Suspense>
      </div>
    </div>
  );
}

function CriticalErrorsList() {
  const [criticalData, setCriticalData] = useState<{
    criticalErrors: any[];
    formattedDates: string[];
    criticalLogs: ExtendedLogEntry[];
    criticalCount: number;
  }>({
    criticalErrors: [],
    formattedDates: [],
    criticalLogs: [],
    criticalCount: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/logs/critical');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        
        const data = await response.json();
        setCriticalData(data);
      } catch (err) {
        console.error("Error fetching critical errors:", err);
        setError(err instanceof Error ? err.message : "Failed to load critical error data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return <div className="glass-card p-8 text-center">Loading critical errors...</div>;
  }
  
  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-destructive mb-2">Error loading data</p>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  const { criticalErrors, formattedDates, criticalCount } = criticalData;
  
  // Calculate pagination values
  const totalPages = Math.ceil(criticalErrors.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedErrors = criticalErrors.slice(startIndex, endIndex);
  const paginatedDates = formattedDates.slice(startIndex, endIndex);
  
  return (
    <div>
      {criticalErrors.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-xl font-medium mb-2">No critical errors found</p>
          <p className="text-muted-foreground">
            Great! Your system is operating without critical failures
          </p>
        </div>
      ) : (
        <>
          <div className="glass-card p-5 mb-6">
            <div className="flex items-center">
              <AlertTriangleIcon className="mr-2 text-destructive" size={20} />
              <h3 className="text-lg font-medium">
                Total critical errors: <span className="text-destructive">{criticalCount}</span>
              </h3>
            </div>
          </div>
          
          <div className="space-y-6">
            {paginatedErrors.map((error, index) => (
              <CriticalErrorItem 
                key={startIndex + index} 
                error={error} 
                formattedDate={paginatedDates[index]}
              />
            ))}
          </div>
          
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
} 