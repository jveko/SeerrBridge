"use client";

import { useState, useEffect } from "react";
import { 
  BellIcon, 
  CheckCircleIcon, 
  AlertCircleIcon, 
  AlertTriangleIcon, 
  XIcon, 
  RefreshCwIcon,
  CalendarClockIcon
} from "lucide-react";
import { NotificationHistoryItem, NotificationType } from "@/lib/notifications";

export function NotificationHistory() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [lastViewedTimestamp, setLastViewedTimestamp] = useState<string | null>(null);
  const [unviewedCount, setUnviewedCount] = useState<number>(0);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications/history");
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.history);
        
        // Count unviewed notifications
        const newUnviewedCount = data.history.filter((notification: NotificationHistoryItem) => !notification.viewed).length;
        setUnviewedCount(newUnviewedCount);
        setHasNewNotifications(newUnviewedCount > 0);
      }
    } catch (error) {
      console.error("Failed to fetch notification history:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unviewed count separately to update only the badge
  const fetchUnviewedCount = async () => {
    try {
      const response = await fetch("/api/notifications/history/viewed");
      if (response.ok) {
        const data = await response.json();
        setUnviewedCount(data.unviewedCount);
        setHasNewNotifications(data.unviewedCount > 0);
      }
    } catch (error) {
      console.error("Failed to fetch unviewed count:", error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchNotifications();
    
    // Set up interval to check for new notifications
    const interval = setInterval(() => {
      // Only fetch count if not open
      if (!isOpen) {
        fetchUnviewedCount();
      } else {
        fetchNotifications();
      }
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [isOpen, lastViewedTimestamp]);

  const handleOpenModal = async () => {
    setIsOpen(true);
    const now = new Date().toISOString();
    setLastViewedTimestamp(now);
    
    // Mark notifications as viewed
    try {
      const response = await fetch("/api/notifications/history/viewed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ viewTimestamp: now }),
      });
      
      if (response.ok) {
        setHasNewNotifications(false);
        setUnviewedCount(0);
        
        // Refresh notifications to get the updated viewed status
        fetchNotifications();
      }
    } catch (error) {
      console.error("Failed to mark notifications as viewed:", error);
    }
  };

  const handleCloseModal = () => {
    setIsOpen(false);
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "success":
        return <CheckCircleIcon size={16} className="text-success mr-2" />;
      case "error":
        return <AlertCircleIcon size={16} className="text-destructive mr-2" />;
      case "warning":
        return <AlertTriangleIcon size={16} className="text-warning mr-2" />;
      default:
        return <BellIcon size={16} className="text-primary mr-2" />;
    }
  };

  const getNotificationClass = (type: NotificationType, successful: boolean, viewed: boolean = true) => {
    // Add a subtle background for unviewed items
    const viewedClass = viewed ? "" : "ring-1 ring-primary/30";
    
    if (!successful) return `bg-muted/20 border-muted/30 ${viewedClass}`;
    
    switch (type) {
      case "success":
        return `bg-success/100 border-success/20 ${viewedClass}`;
      case "error":
        return `bg-destructive/10 border-destructive/20 ${viewedClass}`;
      case "warning":
        return `bg-warning/10 border-warning/20 ${viewedClass}`;
      default:
        return `bg-primary/10 border-primary/20 ${viewedClass}`;
    }
  };

  // Format a timestamp to a readable format
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Group notifications by date for better organization
  const groupNotificationsByDate = () => {
    const groups: Record<string, NotificationHistoryItem[]> = {};
    
    notifications.forEach(notification => {
      const date = new Date(notification.timestamp);
      const dateString = date.toLocaleDateString();
      
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      
      groups[dateString].push(notification);
    });
    
    return groups;
  };

  // Calculate relative time for a date
  const getRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return date.toLocaleDateString();
  };

  const notificationGroups = groupNotificationsByDate();

  return (
    <>
      {/* Notification Bell Button */}
      <button 
        className="relative p-2 rounded-full bg-background/30 hover:bg-background/50 transition-colors"
        onClick={handleOpenModal}
        aria-label="Notification History"
      >
        <BellIcon size={20} className="text-primary" />
        {hasNewNotifications && (
          <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        )}
        {unviewedCount > 0 && (
          <span className="absolute -bottom-1 -right-1 flex items-center justify-center h-4 w-4 text-[10px] rounded-full bg-primary text-primary-foreground">
            {unviewedCount > 99 ? '99+' : unviewedCount}
          </span>
        )}
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="glass-card p-0 max-w-md w-full max-h-[90vh] flex flex-col rounded-lg">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h2 className="text-lg font-medium flex items-center">
                <BellIcon size={18} className="mr-2 text-primary" />
                Notification History
                <span className="ml-2 text-xs text-muted-foreground font-normal flex items-center">
                  <CalendarClockIcon size={12} className="mr-1" />
                  Past 24 hours
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchNotifications}
                  className="p-1 rounded-full hover:bg-muted/20"
                  aria-label="Refresh"
                  title="Refresh notifications"
                >
                  <RefreshCwIcon size={16} className={loading ? "animate-spin" : ""} />
                </button>
                <button 
                  onClick={handleCloseModal}
                  className="p-1 rounded-full hover:bg-muted/20"
                  aria-label="Close"
                >
                  <XIcon size={20} />
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-4">
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCwIcon size={24} className="animate-spin text-primary" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No notifications in the past 24 hours</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(notificationGroups).map(([dateString, items]) => (
                    <div key={dateString} className="space-y-3">
                      <div className="flex items-center gap-2 sticky top-0 bg-background/90 backdrop-blur-sm py-1">
                        <CalendarClockIcon size={14} className="text-muted-foreground" />
                        <h3 className="text-sm font-medium text-muted-foreground">
                          {dateString === new Date().toLocaleDateString() ? 'Today' : dateString}
                        </h3>
                        <div className="h-px flex-1 bg-border/50"></div>
                      </div>
                      
                      {items.map((notification) => (
                        <div 
                          key={notification.id}
                          className={`p-3 rounded-md border ${getNotificationClass(notification.type, notification.successful, notification.viewed)}`}
                        >
                          <div className="flex items-center">
                            {getNotificationIcon(notification.type)}
                            <span className="font-medium">{notification.title}</span>
                            {notification.viewed === false && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">New</span>
                            )}
                          </div>
                          <p className="mt-1 text-sm">{notification.message}</p>
                          <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-2">
                            <span title={formatTimestamp(notification.timestamp)}>
                              {getRelativeTime(notification.timestamp)}
                            </span>
                            {!notification.successful && (
                              <span className="text-destructive">Failed to send</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 