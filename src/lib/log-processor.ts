import fs from "fs";
import path from "path";
import { 
  sendSuccessNotification, 
  sendErrorNotification, 
  sendWarningNotification 
} from "./notifications";

// Define a pattern for extracting log information
interface LogMatch {
  type: "success" | "error" | "warning";
  title: string;
  message: string;
  details?: Record<string, string>;
}

// Keep track of processed log entries by hash
const processedEntries = new Set<string>();

/**
 * Generate a hash for a log entry to avoid duplicate processing
 */
function generateLogHash(entry: LogMatch): string {
  return `${entry.type}:${entry.title}:${entry.message}`;
}

/**
 * Parse a log line to extract relevant information
 */
function parseLogLine(line: string): LogMatch | null {
  // Success log pattern
  let match = line.match(/\[(.+?)\]\s+✅\s+(.*?):\s+(.*)/);
  if (match) {
    return {
      type: "success",
      title: match[2],
      message: match[3],
      details: { timestamp: match[1] }
    };
  }
  
  // Error log pattern
  match = line.match(/\[(.+?)\]\s+❌\s+(.*?):\s+(.*)/);
  if (match) {
    return {
      type: "error", 
      title: match[2],
      message: match[3],
      details: { timestamp: match[1] }
    };
  }
  
  // Warning log pattern
  match = line.match(/\[(.+?)\]\s+⚠️\s+(.*?):\s+(.*)/);
  if (match) {
    return {
      type: "warning",
      title: match[2],
      message: match[3],
      details: { timestamp: match[1] }
    };
  }
  
  return null;
}

/**
 * Send a notification for a log entry if it hasn't been processed already
 */
async function processLogEntry(entry: LogMatch): Promise<boolean> {
  const hash = generateLogHash(entry);
  
  // Skip if already processed
  if (processedEntries.has(hash)) {
    return false;
  }
  
  try {
    let success = false;
    
    switch (entry.type) {
      case "success":
        success = await sendSuccessNotification(entry.title, entry.message, entry.details);
        break;
      case "error":
        success = await sendErrorNotification(entry.title, entry.message, entry.details);
        break;
      case "warning":
        success = await sendWarningNotification(entry.title, entry.message, entry.details);
        break;
    }
    
    if (success) {
      // Mark as processed
      processedEntries.add(hash);
      
      // Keep the set from growing indefinitely
      if (processedEntries.size > 1000) {
        // Convert to array, remove oldest entries, convert back to set
        const entriesArray = Array.from(processedEntries);
        processedEntries.clear();
        entriesArray.slice(-500).forEach(entry => processedEntries.add(entry));
      }
    }
    
    return success;
  } catch (error) {
    console.error(`Failed to send notification for log entry:`, error);
    return false;
  }
}

/**
 * Process console output from stdout/stderr
 */
export async function processConsoleOutput(output: string): Promise<number> {
  const lines = output.split('\n').filter(line => line.trim().length > 0);
  let notificationCount = 0;
  
  for (const line of lines) {
    const logEntry = parseLogLine(line);
    if (logEntry) {
      const sent = await processLogEntry(logEntry);
      if (sent) notificationCount++;
    }
  }
  
  return notificationCount;
}

/**
 * Process a log file for notifications
 */
export async function processLogFile(filePath: string): Promise<number> {
  if (!fs.existsSync(filePath)) {
    return 0;
  }
  
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return processConsoleOutput(content);
  } catch (error) {
    console.error(`Error processing log file ${filePath}:`, error);
    return 0;
  }
}

/**
 * Get the most recent log file in the logs directory
 */
export function getMostRecentLogFile(): string | null {
  const logsDir = path.join(process.cwd(), 'logs');
  
  if (!fs.existsSync(logsDir)) {
    return null;
  }
  
  try {
    const files = fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.log'))
      .map(file => ({
        name: file,
        path: path.join(logsDir, file),
        mtime: fs.statSync(path.join(logsDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    return files.length > 0 ? files[0].path : null;
  } catch (error) {
    console.error('Error finding most recent log file:', error);
    return null;
  }
}

/**
 * Process the most recent log file for notifications
 */
export async function processRecentLogs(): Promise<number> {
  const logFile = getMostRecentLogFile();
  if (!logFile) return 0;
  return processLogFile(logFile);
} 