import fs from "fs";
import path from "path";
import { NotificationType } from "./notifications";
import { 
  readNotificationSettingsFromFile, 
  sendDiscordWebhook 
} from "./server-notifications";

// Keep track of processed log entries by hash
const processedEntries = new Set<string>();

// Regular expressions to match log patterns
const LOG_PATTERNS = {
  success: /\[(.+?)\]\s+✅\s+(.*?):\s+(.*)/,
  error: /\[(.+?)\]\s+❌\s+(.*?):\s+(.*)/,
  warning: /\[(.+?)\]\s+⚠️\s+(.*?):\s+(.*)/
};

/**
 * Generate a hash for a log entry to avoid duplicate processing
 */
function generateEntryHash(type: string, title: string, message: string): string {
  return `${type}:${title}:${message}`;
}

/**
 * Get all log files in the logs directory
 */
export function getLogFiles(): string[] {
  const logsDir = path.join(process.cwd(), 'logs');
  
  if (!fs.existsSync(logsDir)) {
    return [];
  }
  
  try {
    return fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.log'))
      .map(file => path.join(logsDir, file));
  } catch (error) {
    console.error('Error reading log directory:', error);
    return [];
  }
}

/**
 * Process log files for new notifications
 */
export async function processLogFiles(): Promise<number> {
  const logFiles = getLogFiles();
  let notificationCount = 0;
  
  for (const filePath of logFiles) {
    try {
      if (!fs.existsSync(filePath)) {
        continue;
      }
      
      const content = await fs.promises.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      
      for (const line of lines) {
        const result = await processLogLine(line);
        if (result) notificationCount++;
      }
    } catch (error) {
      console.error(`Error processing log file ${filePath}:`, error);
    }
  }
  
  return notificationCount;
}

/**
 * Process a single log line and send notification if needed
 */
async function processLogLine(line: string): Promise<boolean> {
  // Try to match against our patterns
  for (const [type, regex] of Object.entries(LOG_PATTERNS)) {
    const match = line.match(regex);
    
    if (match) {
      const timestamp = match[1];
      const title = match[2];
      const message = match[3];
      
      // Generate a hash to avoid duplicates
      const hash = generateEntryHash(type, title, message);
      
      // Skip if already processed
      if (processedEntries.has(hash)) {
        return false;
      }
      
      // Send notification
      const settings = await readNotificationSettingsFromFile();
      
      // Check if this notification type is enabled
      let isEnabled = false;
      switch (type as NotificationType) {
        case "success":
          isEnabled = settings.notify_on_success;
          break;
        case "error":
          isEnabled = settings.notify_on_error;
          break;
        case "warning":
          isEnabled = settings.notify_on_warning;
          break;
      }
      
      if (isEnabled && settings.discord_webhook_url) {
        const success = await sendDiscordWebhook(
          settings.discord_webhook_url,
          type as NotificationType,
          title,
          message,
          { timestamp }
        );
        
        if (success) {
          // Mark as processed
          processedEntries.add(hash);
          
          // Keep the set from growing too large
          if (processedEntries.size > 1000) {
            const entriesArray = Array.from(processedEntries);
            processedEntries.clear();
            entriesArray.slice(-500).forEach(entry => processedEntries.add(entry));
          }
          
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Global in-memory buffer for console logs
 */
interface ConsoleRecord {
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  processed: boolean;
}

const consoleBuffer: ConsoleRecord[] = [];

/**
 * Add a record to the console buffer
 */
export function addConsoleRecord(
  type: NotificationType,
  title: string,
  message: string
): void {
  consoleBuffer.unshift({
    type,
    title,
    message,
    timestamp: new Date().toISOString(),
    processed: false
  });
  
  // Keep buffer size under control
  if (consoleBuffer.length > 1000) {
    consoleBuffer.pop();
  }
}

/**
 * Process console records and send notifications
 */
export async function processConsoleRecords(): Promise<number> {
  // First process any log files
  const fileNotificationCount = await processLogFiles();
  
  // Then process in-memory records
  let bufferNotificationCount = 0;
  const unprocessedRecords = consoleBuffer.filter(record => !record.processed);
  
  for (const record of unprocessedRecords) {
    const hash = generateEntryHash(record.type, record.title, record.message);
    
    // Skip if already processed
    if (processedEntries.has(hash)) {
      record.processed = true;
      continue;
    }
    
    // Get settings
    const settings = await readNotificationSettingsFromFile();
    
    // Check if this notification type is enabled
    let isEnabled = false;
    switch (record.type) {
      case "success":
        isEnabled = settings.notify_on_success;
        break;
      case "error":
        isEnabled = settings.notify_on_error;
        break;
      case "warning":
        isEnabled = settings.notify_on_warning;
        break;
    }
    
    if (isEnabled && settings.discord_webhook_url) {
      try {
        const success = await sendDiscordWebhook(
          settings.discord_webhook_url,
          record.type,
          record.title,
          record.message,
          { timestamp: record.timestamp }
        );
        
        if (success) {
          processedEntries.add(hash);
          bufferNotificationCount++;
        }
      } catch (error) {
        console.error(`Failed to send notification:`, error);
      }
    }
    
    // Mark as processed regardless of outcome to avoid retrying
    record.processed = true;
  }
  
  return fileNotificationCount + bufferNotificationCount;
} 