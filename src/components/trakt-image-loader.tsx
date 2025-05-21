"use client";

import { useState, useEffect } from 'react';
import { useTraktImageCache, TraktImageData } from '@/lib/trakt-image-cache';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

interface TraktImageProps {
  traktId: string | number;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  index?: number; // Used for staggered loading
  priority?: boolean; // Whether to load this image with priority
}

/**
 * Component for loading Trakt images with controlled, staggered loading
 * to prevent rate limiting
 */
export function TraktImage({
  traktId,
  alt = 'Show poster',
  width = 150,
  height = 225,
  className = '',
  index = 0,
  priority = false,
}: TraktImageProps) {
  const { getImageData, fetchImageData, isLoading, isBlacklisted } = useTraktImageCache();
  const [imageData, setImageData] = useState<TraktImageData | null>(getImageData(traktId));
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate staggered delay based on index (100ms increment per item, max 3s)
  // Priority items get a much shorter delay
  const loadDelay = priority ? (index * 50) : Math.min(index * 100, 3000);
  
  useEffect(() => {
    // If we already have image data, no need to fetch
    if (imageData) return;
    
    // If the ID is blacklisted, don't even try to fetch
    if (isBlacklisted(traktId)) return;
    
    // If already loading, don't start another request
    if (isLoading(traktId) || isLoadingState) return;
    
    const loadImage = async () => {
      try {
        setIsLoadingState(true);
        setError(null);
        
        // Delayed loading based on item position
        await new Promise(resolve => setTimeout(resolve, loadDelay));
        
        // Only try to fetch if component is still mounted
        const data = await fetchImageData(traktId);
        setImageData(data);
      } catch (err) {
        setError(`Failed to load image: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoadingState(false);
      }
    };
    
    loadImage();
  }, [traktId, fetchImageData, imageData, isLoading, isBlacklisted, loadDelay, isLoadingState]);
  
  // Show loading skeleton while fetching
  if (!imageData && (isLoadingState || isLoading(traktId))) {
    return (
      <Skeleton 
        className={`bg-muted/50 ${className}`}
        style={{ width: width || 150, height: height || 225 }}
      />
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div 
        className={`flex items-center justify-center border border-muted bg-muted/20 text-muted-foreground text-xs p-2 ${className}`}
        style={{ width: width || 150, height: height || 225 }}
      >
        Failed to load image
      </div>
    );
  }
  
  // Show image if available
  if (imageData?.images.poster) {
    return (
      <Image
        src={imageData.images.poster}
        alt={alt || `${imageData.title} (${imageData.year})`}
        width={width}
        height={height}
        className={`object-cover ${className}`}
      />
    );
  }
  
  // Show placeholder for blacklisted IDs with special message
  if (isBlacklisted(traktId)) {
    return (
      <div 
        className={`flex items-center justify-center border border-muted bg-muted/20 text-muted-foreground text-xs p-2 ${className}`}
        style={{ width: width || 150, height: height || 225 }}
      >
        No image available
      </div>
    );
  }
  
  // Show placeholder if no image is available
  return (
    <div 
      className={`flex items-center justify-center border border-muted bg-muted/20 text-muted-foreground text-xs p-2 ${className}`}
      style={{ width: width || 150, height: height || 225 }}
    >
      No image available
    </div>
  );
} 