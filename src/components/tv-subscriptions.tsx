"use client";

import { ShowSubscription, formatDate } from "@/lib/utils";
import { 
  TvIcon,
  AlertTriangleIcon,
  CalendarIcon,
  InfoIcon,
  NetworkIcon,
  CheckCircleIcon,
  XIcon,
  StarIcon,
  ListIcon,
  Trash2Icon,
  AlertOctagonIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRefresh } from "@/lib/refresh-context";
import { TraktShowImage } from "@/components/trakt-show-image";
import Image from "next/image";
import { useTraktImageCache } from "@/lib/trakt-image-cache";

// Confirmation dialog component
function ConfirmationDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onCancel}>
      <div 
        className="bg-background rounded-lg shadow-lg w-full max-w-md glass-card futuristic-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border flex items-center text-destructive">
          <AlertOctagonIcon size={20} className="mr-2" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>

        <div className="p-5">
          <p className="text-sm text-muted-foreground mb-6">{message}</p>
          
          <div className="flex justify-end space-x-3">
            <button 
              onClick={onCancel}
              className="px-4 py-2 rounded-md border border-border bg-background hover:bg-muted transition-colors text-sm"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-sm"
            >
              Unsubscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dialog component for the modal
function SubscriptionDetailsDialog({ 
  show, 
  isOpen, 
  onClose,
  onUnsubscribe 
}: { 
  show: ShowSubscription | null, 
  isOpen: boolean, 
  onClose: () => void,
  onUnsubscribe: (show: ShowSubscription) => void 
}) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEnlarged, setIsEnlarged] = useState(false);
  
  const { getImageData, fetchImageData } = useTraktImageCache();
  const [imageData, setImageData] = useState(() => {
    if (show?.trakt_show_id) {
      return getImageData(show.trakt_show_id) || null;
    }
    return null;
  });
  
  useEffect(() => {
    if (!show?.trakt_show_id) return;
    
    const id = String(show.trakt_show_id);
    
    // Check cache first
    const cachedData = getImageData(id);
    if (cachedData) {
      setImageData(cachedData);
      return;
    }
    
    // Fetch if not cached
    fetchImageData(id).then(data => {
      if (data) {
        setImageData(data);
      }
    }).catch(error => {
      console.error('Error fetching show image data:', error);
    });
  }, [show?.trakt_show_id, getImageData, fetchImageData]);
  
  if (!isOpen || !show) return null;

  const handleUnsubscribeClick = () => {
    setIsConfirmOpen(true);
  };

  const handleConfirmUnsubscribe = () => {
    onUnsubscribe(show);
    setIsConfirmOpen(false);
  };

  const handleCancelUnsubscribe = () => {
    setIsConfirmOpen(false);
  };
  
  const toggleEnlarged = () => {
    setIsEnlarged(!isEnlarged);
  };

  // Get image URLs
  const posterUrl = imageData?.images?.poster;
  const thumbUrl = imageData?.images?.thumb;
  
  const fullPosterUrl = posterUrl ? 
    (posterUrl.startsWith('http') ? posterUrl : `https://${posterUrl}`) : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-background rounded-lg shadow-lg w-full max-w-full sm:max-w-2xl h-auto max-h-[100%] overflow-hidden glass-card futuristic-border flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
          <div className="flex items-center">
            <div className="mr-3">
              <TraktShowImage 
                traktId={show.trakt_show_id} 
                fallbackLetter={show.show_title.charAt(0).toUpperCase()}
                width={40}
                height={40}
                className="h-10 w-10"
              />
            </div>
            <h2 className="text-lg font-semibold">{show.show_title}</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleUnsubscribeClick} 
              className="p-2 rounded-full hover:bg-destructive/10 text-destructive transition-colors"
              title="Unsubscribe from this show"
            >
              <Trash2Icon size={16} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }} 
              className="p-1 rounded-full hover:bg-primary/10 transition-colors"
              aria-label="Close dialog"
            >
              <XIcon size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Show Poster Image */}
          {fullPosterUrl && (
            <div className="flex justify-center mb-2">
              <div 
                className="glass-card relative overflow-hidden rounded-lg max-w-[160px] shadow-lg cursor-pointer hover:opacity-95 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleEnlarged();
                }}
              >
                <Image 
                  src={fullPosterUrl}
                  alt={`${show.show_title} poster`}
                  width={160}
                  height={240}
                  className="object-cover"
                  priority
                />
                {imageData?.year && (
                  <div className="absolute bottom-0 w-full bg-black/70 py-1 px-2 text-center backdrop-blur-sm">
                    <span className="text-xs font-medium text-white">{imageData.year}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="flex flex-wrap gap-4">
            <div className="glass-card p-3 flex-1 min-w-[180px]">
              <h3 className="text-sm text-muted-foreground mb-1">Network</h3>
              <p className="flex items-center">
                <TvIcon size={16} className="mr-2 text-primary" />
                {show.network || "Unknown"}
              </p>
            </div>
            
            <div className="glass-card p-3 flex-1 min-w-[180px]">
              <h3 className="text-sm text-muted-foreground mb-1">IMDB ID</h3>
              <p>{show.imdb_id || "N/A"}</p>
            </div>
            
            <div className="glass-card p-3 flex-1 min-w-[180px]">
              <h3 className="text-sm text-muted-foreground mb-1">Trakt ID</h3>
              <p>{show.trakt_show_id || "N/A"}</p>
            </div>
            
            <div className="glass-card p-3 flex-1 min-w-[180px]">
              <h3 className="text-sm text-muted-foreground mb-1">Seerr ID</h3>
              <p>{show.seerr_id || "N/A"}</p>
            </div>
          </div>

          {/* Season Details */}
          <div className="glass-card p-4">
            <h3 className="font-semibold flex items-center mb-3">
              <InfoIcon size={16} className="mr-2 text-primary" />
              Season {show.season_number || show.season} Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {show.season_details?.title && (
                <div>
                  <h4 className="text-sm text-muted-foreground">Title</h4>
                  <p>{show.season_details.title}</p>
                </div>
              )}
              
              {show.season_details?.first_aired && (
                <div>
                  <h4 className="text-sm text-muted-foreground">First Aired</h4>
                  <p className="flex items-center">
                    <CalendarIcon size={14} className="mr-2 text-primary" />
                    {formatDate(show.season_details.first_aired)}
                  </p>
                </div>
              )}
              
              {show.season_details?.rating !== undefined && (
                <div>
                  <h4 className="text-sm text-muted-foreground">Rating</h4>
                  <p className="flex items-center">
                    <StarIcon size={14} className="mr-2 text-yellow-500" />
                    {show.season_details.rating.toFixed(1)} ({show.season_details.votes} votes)
                  </p>
                </div>
              )}
              
              <div>
                <h4 className="text-sm text-muted-foreground">Episodes</h4>
                <p>
                  {show.season_details?.aired_episodes !== undefined ? show.season_details.aired_episodes : show.airedEpisodes} aired of {show.season_details?.episode_count || "?"} total
                </p>
              </div>
            </div>
            
            {show.season_details?.overview && (
              <div className="mt-4">
                <h4 className="text-sm text-muted-foreground">Overview</h4>
                <p className="text-sm mt-1">{show.season_details.overview}</p>
              </div>
            )}
          </div>

          {/* Failed Episodes */}
          {show.failedEpisodes && show.failedEpisodes.length > 0 && (
            <div className="glass-card p-4 border-l-4 border-destructive">
              <h3 className="font-semibold flex items-center mb-3">
                <AlertTriangleIcon size={16} className="mr-2 text-destructive" />
                Failed Episodes
              </h3>
              <div className="flex flex-wrap gap-2">
                {show.failedEpisodes.map((ep, i) => (
                  <span key={i} className="px-2 py-1 rounded-md bg-destructive/10 text-destructive text-xs">
                    {ep}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Timestamp */}
          {show.timestamp && (
            <div className="text-xs text-muted-foreground text-right mt-4">
              Last updated: {formatTimestamp(show.timestamp)}
            </div>
          )}
        </div>
      </div>
      
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        title="Unsubscribe from Show"
        message={`Are you sure you want to unsubscribe from "${show.show_title}"? This will remove it from monitoring and attempt to delete the request from Overseerr if possible.`}
        onConfirm={handleConfirmUnsubscribe}
        onCancel={handleCancelUnsubscribe}
      />
      
      {/* Enlarged poster modal */}
      {isEnlarged && fullPosterUrl && (
        <div 
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setIsEnlarged(false)}
        >
          <div 
            className="relative max-w-xs max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsEnlarged(false)}
              className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors z-10"
            >
              <XIcon size={18} />
            </button>
            <Image 
              src={fullPosterUrl}
              alt={`${show.show_title} poster`}
              width={300}
              height={450}
              className="object-contain rounded-lg"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(timestamp: string) {
  // Format like "20250518_213221" to "2025-05-18 21:32:21"
  if (!timestamp || timestamp.length !== 15) return timestamp;
  
  const year = timestamp.substring(0, 4);
  const month = timestamp.substring(4, 6);
  const day = timestamp.substring(6, 8);
  const hour = timestamp.substring(9, 11);
  const minute = timestamp.substring(11, 13);
  const second = timestamp.substring(13, 15);
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function TVSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<ShowSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShow, setSelectedShow] = useState<ShowSubscription | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [unsubscribeLoading, setUnsubscribeLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const { isRefreshing } = useRefresh();

  const fetchData = async () => {
    try {
      // Only show loading state on initial load, not on refreshes
      if (!isRefreshing) setLoading(true);
      
      const response = await fetch('/api/tv-subscriptions');
      const data = await response.json();
      
      // Process data to ensure network property is correct
      const processedSubscriptions = (data.subscriptions || []).map((show: ShowSubscription) => {
        // Create a processed version of the show with all needed properties
        const processed = { ...show };
        
        // If network not directly available, use the one from season_details
        if (!processed.network && processed.season_details?.network) {
          processed.network = processed.season_details.network;
        }
        
        // Map season_number if it exists in the original data
        if (show.season_number) {
          processed.season_number = show.season_number;
        } else if (show.season_details?.number) {
          processed.season_number = show.season_details.number;
        }
        
        return processed;
      });
      
      setSubscriptions(processedSubscriptions);
    } catch (error) {
      console.error('Error fetching TV subscriptions:', error);
    } finally {
      // Keep loading true during refresh to maintain the current view
      if (!isRefreshing) setLoading(false);
    }
  };

  const handleShowClick = (show: ShowSubscription) => {
    setSelectedShow(show);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };
  
  const handleUnsubscribe = async (show: ShowSubscription) => {
    try {
      setUnsubscribeLoading(true);
      
      // Make API call to unsubscribe
      const response = await fetch('/api/tv-subscriptions/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          show_title: show.show_title,
          trakt_show_id: show.trakt_show_id,
          season: show.season_number || show.season 
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unsubscribe');
      }
      
      const data = await response.json();
      
      // Close the dialog
      setIsDialogOpen(false);
      
      // Update the subscriptions list
      setSubscriptions(subscriptions.filter(s => 
        !(s.show_title === show.show_title && 
          s.season_number === show.season_number && 
          s.season === show.season)
      ));
      
      // Show success message with details about Overseerr deletion
      let alertMessage = data.message;
      if (data.warnings && data.warnings.length > 0) {
        alertMessage += `\n\nWarnings:\n${data.warnings.join('\n')}`;
      }
      
      if (data.overseerr_deleted) {
        alert(`✅ ${alertMessage}`);
      } else {
        alert(`⚠️ ${alertMessage}`);
      }
      
    } catch (error) {
      console.error('Error unsubscribing from show:', error);
      alert(`❌ Failed to unsubscribe: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUnsubscribeLoading(false);
    }
  };

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
    // Reset to first page when subscription list changes
    setCurrentPage(1);
  }, [subscriptions.length]);

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

  // Calculate pagination values
  const totalPages = Math.ceil(subscriptions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSubscriptions = subscriptions.slice(startIndex, endIndex);

  // Display loading state only on initial load, not on refreshes
  if (loading && !isRefreshing) {
    return (
      <div className="glass-card p-6 h-96">
        <div className="py-16 text-center text-muted-foreground animate-pulse">
          <p>Loading TV shows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card card-glow futuristic-border h-full flex flex-col ${isRefreshing ? 'shimmer-subtle' : ''}`}>
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-semibold flex items-center">
            <TvIcon size={20} className={`mr-2 text-primary ${isRefreshing ? 'opacity-70' : ''}`} />
            TV Show Subscriptions
          </h2>
          <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted">
            {subscriptions.length} Shows
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Monitored TV shows with tracking status
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {subscriptions.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p>No TV show subscriptions found</p>
            <p className="text-sm mt-1">
              Check if the episode_discrepancies.json file exists and is accessible
            </p>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-3">
              {paginatedSubscriptions.map((show, index) => (
                <div
                  key={`${show.show_title}-${show.season_number || show.season}-${index}`}
                  className="glass-card bg-background/40 p-4 hover:bg-primary/5 transition-colors duration-200 border-l-4 border-l-primary/80 cursor-pointer"
                  onClick={() => handleShowClick(show)}
                >
                  <div className="flex items-start">
                    <div className="mr-4 flex-shrink-0 mt-1">
                      <TraktShowImage 
                        traktId={show.trakt_show_id} 
                        fallbackLetter={show.show_title.charAt(0).toUpperCase()}
                        className={`h-10 w-10 ${isRefreshing ? 'opacity-70' : 'shimmer'}`}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <h3 className="font-semibold">{show.show_title}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs py-1 px-2 bg-primary/10 text-primary rounded-md">
                            Season {show.season_number || show.season}
                          </span>
                          {show.season_details?.rating !== undefined && (
                            <span className="text-xs py-1 px-2 bg-yellow-500/10 text-yellow-500 rounded-md flex items-center">
                              <StarIcon size={12} className="mr-1" />
                              {show.season_details.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-2 text-xs text-muted-foreground">
                        {(show.network || show.season_details?.network) && (
                          <span className="flex items-center">
                            <TvIcon size={12} className="mr-1 text-primary" />
                            {show.network || show.season_details?.network || "Unknown"}
                          </span>
                        )}
                        
                        <span className="flex items-center">
                          <CheckCircleIcon size={12} className="mr-1 text-success" />
                          {show.season_details?.aired_episodes !== undefined ? show.season_details.aired_episodes : show.airedEpisodes} aired 
                          {show.season_details?.episode_count && ` of ${show.season_details.episode_count}`}
                        </span>
                        
                        {show.failedEpisodes && show.failedEpisodes.length > 0 && (
                          <span className="flex items-center">
                            <AlertTriangleIcon size={12} className="mr-1 text-destructive" />
                            {show.failedEpisodes.length} failed
                          </span>
                        )}
                        
                        {show.season_details?.first_aired && (
                          <span className="flex items-center">
                            <CalendarIcon size={12} className="mr-1 text-primary" />
                            {new Date(show.season_details.first_aired).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      {show.failedEpisodes && show.failedEpisodes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-xs text-muted-foreground">Failed:</span>
                          {show.failedEpisodes.slice(0, 5).map((ep, i) => (
                            <span key={i} className="text-xs px-1.5 py-0.5 bg-destructive/10 text-destructive rounded">
                              {ep}
                            </span>
                          ))}
                          {show.failedEpisodes.length > 5 && (
                            <span className="text-xs px-1.5 py-0.5 bg-muted/80 text-muted-foreground rounded">
                              +{show.failedEpisodes.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="p-4 pt-1 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <button 
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
          </>
        )}
      </div>
      
      <SubscriptionDetailsDialog 
        show={selectedShow} 
        isOpen={isDialogOpen} 
        onClose={handleCloseDialog}
        onUnsubscribe={handleUnsubscribe}
      />
    </div>
  );
} 