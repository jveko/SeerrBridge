"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTraktImageCache, TraktImageData } from "@/lib/trakt-image-cache";

interface TraktShowImageProps {
  traktId: number | string | undefined;
  fallbackLetter: string;
  className?: string;
  width?: number;
  height?: number;
}

export function TraktShowImage({ 
  traktId, 
  fallbackLetter, 
  className = "",
  width = 40,
  height = 40
}: TraktShowImageProps) {
  const [imageData, setImageData] = useState<TraktImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { getImageData, fetchImageData, isLoading } = useTraktImageCache();
  
  useEffect(() => {
    if (!traktId) {
      setLoading(false);
      setError("No Trakt ID provided");
      return;
    }
    
    const id = String(traktId);
    
    // Check if the image is already in cache
    const cachedData = getImageData(id);
    if (cachedData) {
      setImageData(cachedData);
      setLoading(false);
      return;
    }
    
    // If not in cache, fetch it
    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check if already loading from another component
        if (isLoading(id)) {
          // Wait for it to be available in cache
          const data = await fetchImageData(id);
          setImageData(data);
        } else {
          // Fetch fresh
          const data = await fetchImageData(id);
          setImageData(data);
        }
      } catch (err) {
        console.error("Error fetching show image:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    
    loadImage();
  }, [traktId, getImageData, fetchImageData, isLoading]);
  
  // Show the fallback letter when:
  // - Loading is complete AND
  // - We have an error OR no image data OR no actual image URL
  const showFallback = !loading && (
    !!error || 
    !imageData || 
    (!imageData.images.thumb && !imageData.images.poster)
  );
  
  if (showFallback) {
    return (
      <div className={`flex items-center justify-center rounded-full bg-primary/20 text-primary ${className}`}
           style={{ width, height }}>
        {fallbackLetter}
      </div>
    );
  }
  
  // If we're still loading, show a loading indicator
  if (loading) {
    return (
      <div className={`flex items-center justify-center rounded-full bg-primary/10 animate-pulse ${className}`}
           style={{ width, height }}>
        {fallbackLetter}
      </div>
    );
  }
  
  // Get the image URL (prefer thumb over poster)
  const imageUrl = imageData?.images.thumb || imageData?.images.poster;
  
  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center rounded-full bg-primary/20 text-primary ${className}`}
           style={{ width, height }}>
        {fallbackLetter}
      </div>
    );
  }
  
  // Add https:// protocol if it's missing
  const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `https://${imageUrl}`;
  
  return (
    <Image
      src={fullImageUrl}
      alt={imageData?.title || "Show thumbnail"}
      width={width}
      height={height}
      className={`rounded-full object-cover ${className}`}
      onError={() => {
        setError("Failed to load image");
      }}
    />
  );
} 