import {
  sendSuccessNotification,
  sendErrorNotification,
  sendWarningNotification
} from "./notifications";

type LogLevel = "info" | "success" | "warning" | "error";

interface LogOptions {
  sendNotification?: boolean;
  details?: Record<string, string>;
}

/**
 * Log a message to the server via the API
 */
async function logToServer(
  type: "success" | "error" | "warning",
  title: string,
  message: string
): Promise<void> {
  try {
    await fetch('/api/notifications/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        title,
        message
      }),
    });
  } catch (error) {
    console.error('Failed to log to server:', error);
  }
}

/**
 * Log a message with a specific level and optionally send a notification
 */
export async function log(
  level: LogLevel,
  title: string,
  message: string,
  options: LogOptions = {}
): Promise<void> {
  const { sendNotification = true, details = {} } = options;
  const timestamp = new Date().toISOString();
  
  // Enhanced details with timestamp
  const enhancedDetails = {
    ...details,
    Timestamp: timestamp,
  };
  
  // Log to console with appropriate styling
  switch (level) {
    case "info":
      console.log(`[${timestamp}] ℹ️ ${title}: ${message}`);
      break;
    case "success":
      console.log(`[${timestamp}] ✅ ${title}: ${message}`);
      // Log to server for success
      await logToServer("success", title, message);
      break;
    case "warning":
      console.warn(`[${timestamp}] ⚠️ ${title}: ${message}`);
      // Log to server for warning
      await logToServer("warning", title, message);
      break;
    case "error":
      console.error(`[${timestamp}] ❌ ${title}: ${message}`);
      // Log to server for error
      await logToServer("error", title, message);
      break;
  }
  
  // Send notification immediately if explicitly requested
  if (sendNotification) {
    try {
      switch (level) {
        case "success":
          await sendSuccessNotification(title, message, enhancedDetails);
          break;
        case "warning":
          await sendWarningNotification(title, message, enhancedDetails);
          break;
        case "error":
          await sendErrorNotification(title, message, enhancedDetails);
          break;
        // No notification for info level
      }
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  }
}

// Helper functions for specific log levels
export const logInfo = (
  title: string,
  message: string,
  options?: LogOptions
) => log("info", title, message, options);

export const logSuccess = (
  title: string,
  message: string,
  options?: LogOptions
) => log("success", title, message, options);

export const logWarning = (
  title: string,
  message: string,
  options?: LogOptions
) => log("warning", title, message, options);

export const logError = (
  title: string,
  message: string,
  options?: LogOptions
) => log("error", title, message, options); 