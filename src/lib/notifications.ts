// Define notification types
export type NotificationType = "success" | "error" | "warning";

// Define the notification settings interface
export interface NotificationSettings {
  discord_webhook_url: string;
  notify_on_success: boolean;
  notify_on_error: boolean;
  notify_on_warning: boolean;
  show_debug_widget: boolean;
}

// Define notification history interface
export interface NotificationHistoryItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  details?: Record<string, string>;
  timestamp: string;
  successful: boolean;
  viewed?: boolean;
}

// File path for storing notification history
let notificationHistoryFilePath = ''; // Will be set in initialization

// Function to set the notification history file path
export function setNotificationHistoryFilePath(filePath: string): void {
  notificationHistoryFilePath = filePath;
}

// Function to generate a unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Read notification settings - works on client or server side
 */
export async function readNotificationSettings(): Promise<NotificationSettings> {
  try {
    const response = await fetch('/api/notifications', { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch notification settings');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error reading notification settings:", error);
    return {
      discord_webhook_url: "",
      notify_on_success: false,
      notify_on_error: true,
      notify_on_warning: false,
      show_debug_widget: false,
    };
  }
}

/**
 * Check if notifications are enabled for a specific type
 */
export async function isNotificationEnabled(type: NotificationType): Promise<boolean> {
  const settings = await readNotificationSettings();
  
  if (!settings.discord_webhook_url) {
    return false;
  }
  
  switch (type) {
    case "success":
      return settings.notify_on_success;
    case "error":
      return settings.notify_on_error;
    case "warning":
      return settings.notify_on_warning;
    default:
      return false;
  }
}

/**
 * Send a notification to Discord
 */
export async function sendNotification(
  type: NotificationType,
  title: string,
  message: string,
  details?: Record<string, string>
): Promise<boolean> {
  try {
    // Check if this type of notification is enabled
    const isEnabled = await isNotificationEnabled(type);
    if (!isEnabled) {
      return false;
    }
    
    // Send the notification through our API
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        title,
        message,
        details
      }),
    });
    
    const success = response.ok;
    
    // Store in history regardless of success
    const historyItem: NotificationHistoryItem = {
      id: generateId(),
      type,
      title,
      message,
      details,
      timestamp: new Date().toISOString(),
      successful: success
    };
    
    addToNotificationHistory(historyItem);
    
    if (!success) {
      console.error(`Failed to send ${type} notification:`, await response.text());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error sending ${type} notification:`, error);
    
    // Store failed notification in history
    const historyItem: NotificationHistoryItem = {
      id: generateId(),
      type,
      title,
      message,
      details,
      timestamp: new Date().toISOString(),
      successful: false
    };
    
    addToNotificationHistory(historyItem);
    
    return false;
  }
}

/**
 * Add notification to history
 * This is now a client-side only function that sends to the server
 */
export function addToNotificationHistory(notification: NotificationHistoryItem): void {
  // When called from client, call the API to store the notification
  if (typeof window !== 'undefined') {
    fetch('/api/notifications/history/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    }).catch(err => {
      console.error('Failed to add notification to history:', err);
    });
    return;
  }
  
  // Server-side implementation will be in the API route
}

/**
 * Get notification history
 * This is now a client-side only function that fetches from the server
 */
export function getNotificationHistory(): NotificationHistoryItem[] {
  // This should never be called server-side directly
  // Server-side implementation is in the API route
  return [];
}

/**
 * Prune notification history to only keep notifications from the past 24 hours
 * Returns the count of remaining notifications after pruning
 */
export function pruneNotificationHistory(): number {
  // Client-side implementation calls the API
  if (typeof window !== 'undefined') {
    fetch('/api/notifications/history/prune', {
      method: 'GET',
    }).catch(err => {
      console.error('Failed to prune notification history:', err);
    });
    return 0;
  }
  
  // Server-side implementation will be in the API route
  return 0;
}

/**
 * Helper functions for specific notification types
 */
export async function sendSuccessNotification(
  title: string,
  message: string,
  details?: Record<string, string>
): Promise<boolean> {
  return sendNotification("success", title, message, details);
}

export async function sendErrorNotification(
  title: string,
  message: string,
  details?: Record<string, string>
): Promise<boolean> {
  return sendNotification("error", title, message, details);
}

export async function sendWarningNotification(
  title: string,
  message: string,
  details?: Record<string, string>
): Promise<boolean> {
  return sendNotification("warning", title, message, details);
} 