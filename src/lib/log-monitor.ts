import fs from 'fs';
import path from 'path';
import { 
  sendSuccessNotification, 
  sendErrorNotification, 
  sendWarningNotification,
  NotificationType
} from './notifications';

// Persistent storage for processed log entries
const APP_ROOT = process.cwd();
const LOGS_DIR = path.join(APP_ROOT, 'logs');
const PROCESSED_ENTRIES_FILE = path.join(LOGS_DIR, 'processed_entries.json');
console.log(`[LOG-MONITOR] Processed entries file path: ${PROCESSED_ENTRIES_FILE}`);

// Keep track of processed log positions
interface LogTracker {
  filePath: string;
  lastPosition: number;
  lastCheckTime: number;
}

const logTrackers: Map<string, LogTracker> = new Map();

// Regular expressions to identify log types
const LOG_PATTERNS = {
  // Standard formats
  success: /\[.*\]\s+✅\s+(.*?):\s+(.*)/,
  error: /\[.*\]\s+❌\s+(.*?):\s+(.*)/,
  warning: /\[.*\]\s+⚠️\s+(.*?):\s+(.*)/,
  
  // SeerrBridge log formats - handling different capitalizations
  seerbridge_success: /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+\|\s+(?:SUCCESS|success)\s+\|\s+(.*?)\s+-\s+(.*)/i,
  seerbridge_error: /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+\|\s+(?:ERROR|error)\s+\|\s+(.*?)\s+-\s+(.*)/i,
  seerbridge_warning: /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+\|\s+(?:WARNING|warning)\s+\|\s+(.*?)\s+-\s+(.*)/i
};

/**
 * Read processed entries from file
 */
function readProcessedEntries(): Set<string> {
  try {
    console.log(`[LOG-MONITOR] Checking for processed entries file at: ${PROCESSED_ENTRIES_FILE}`);
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(LOGS_DIR)) {
      console.log(`[LOG-MONITOR] Logs directory doesn't exist, creating it at: ${LOGS_DIR}`);
      try {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
        console.log(`[LOG-MONITOR] Successfully created logs directory`);
      } catch (dirError) {
        console.error(`[LOG-MONITOR] Failed to create logs directory:`, dirError);
      }
    }
    
    console.log(`[LOG-MONITOR] File exists: ${fs.existsSync(PROCESSED_ENTRIES_FILE)}`);
    
    if (fs.existsSync(PROCESSED_ENTRIES_FILE)) {
      const data = fs.readFileSync(PROCESSED_ENTRIES_FILE, 'utf8');
      console.log(`[LOG-MONITOR] Successfully read processed entries file, size: ${data.length} bytes`);
      const entries = JSON.parse(data);
      return new Set(entries);
    } else {
      console.log(`[LOG-MONITOR] Processed entries file not found, creating new empty file`);
      
      // Create an empty file with an empty array
      try {
        fs.writeFileSync(PROCESSED_ENTRIES_FILE, JSON.stringify([]), 'utf8');
        console.log(`[LOG-MONITOR] Successfully created empty processed entries file`);
        return new Set<string>();
      } catch (fileError) {
        console.error(`[LOG-MONITOR] Failed to create empty processed entries file:`, fileError);
      }
    }
  } catch (error) {
    console.error('[LOG-MONITOR] Error reading processed entries file:', error);
  }
  return new Set<string>();
}

/**
 * Save processed entries to file
 */
function saveProcessedEntries(entries: Set<string>): void {
  try {
    // Keep only the most recent 1000 entries to prevent the file from growing too large
    const entriesArray = Array.from(entries);
    const trimmedEntries = entriesArray.slice(-1000);
    
    console.log(`[LOG-MONITOR] Saving ${trimmedEntries.length} processed entries to: ${PROCESSED_ENTRIES_FILE}`);
    
    // Make sure the parent directory exists
    const dir = path.dirname(PROCESSED_ENTRIES_FILE);
    if (!fs.existsSync(dir)) {
      console.log(`[LOG-MONITOR] Creating parent directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(
      PROCESSED_ENTRIES_FILE,
      JSON.stringify(trimmedEntries),
      'utf8'
    );
    
    console.log(`[LOG-MONITOR] Successfully saved processed entries file`);
    
    // Verify file was created
    console.log(`[LOG-MONITOR] File exists after save: ${fs.existsSync(PROCESSED_ENTRIES_FILE)}`);
  } catch (error) {
    console.error('[LOG-MONITOR] Error saving processed entries file:', error);
  }
}

/**
 * Generate a hash for a log entry
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
 * Process a single log file and send notifications for new entries
 */
export async function processLogFile(filePath: string): Promise<void> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return;
    }
    
    // Get file stats
    const stats = fs.statSync(filePath);
    
    // Get or create tracker for this file
    let tracker = logTrackers.get(filePath);
    if (!tracker) {
      tracker = {
        filePath,
        lastPosition: 0,
        lastCheckTime: 0
      };
      logTrackers.set(filePath, tracker);
    }
    
    // If file hasn't changed since last check, skip processing
    if (stats.mtimeMs <= tracker.lastCheckTime) {
      return;
    }
    
    // Read from last position to end of file
    let fileHandle: fs.promises.FileHandle | null = null;
    try {
      fileHandle = await fs.promises.open(filePath, 'r');
      const buffer = Buffer.alloc(stats.size - tracker.lastPosition);
      
      if (stats.size > tracker.lastPosition) {
        await fileHandle.read(buffer, 0, buffer.length, tracker.lastPosition);
        const newContent = buffer.toString();
        
        // Process new log entries
        const lines = newContent.split('\n').filter(line => line.trim().length > 0);
        
        // Load processed entries
        const processedEntries = readProcessedEntries();
        let entriesModified = false;
        
        for (const line of lines) {
          const processed = await processLogLine(line, processedEntries);
          if (processed) {
            entriesModified = true;
          }
        }
        
        // Save processed entries if modified
        if (entriesModified) {
          saveProcessedEntries(processedEntries);
        }
      }
      
      // Update tracker
      tracker.lastPosition = stats.size;
      tracker.lastCheckTime = Date.now();
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
    }
  } catch (error) {
    console.error(`Error processing log file ${filePath}:`, error);
  }
}

/**
 * Process a single log line and send notification if it matches a pattern
 */
async function processLogLine(line: string, processedEntries: Set<string>): Promise<boolean> {
  // Try to match the line against each pattern
  let match;
  let processed = false;
  
  // Check all patterns
  for (const [type, regex] of Object.entries(LOG_PATTERNS)) {
    match = regex.exec(line);
    if (match) {
      console.log(`[LOG-MONITOR] Log line matched pattern ${type}`);
      
      // Extract title and message
      let title, message;
      if (type.startsWith('seerbridge_')) {
        title = match[2];
        message = match[3];
      } else {
        title = match[1];
        message = match[2];
      }
      
      // Determine notification type
      let notificationType: NotificationType;
      if (type.includes('success')) {
        notificationType = "success";
      } else if (type.includes('error')) {
        notificationType = "error";
      } else if (type.includes('warning')) {
        notificationType = "warning";
      } else {
        continue; // Skip other types
      }
      
      // Generate hash for deduplication
      const hash = generateEntryHash(notificationType, title, message);
      
      // Skip if already processed
      if (processedEntries.has(hash)) {
        return false;
      }
      
      // Send appropriate notification
      switch (notificationType) {
        case "success":
          await sendSuccessNotification(title, message);
          break;
        case "error":
          await sendErrorNotification(title, message);
          break;
        case "warning":
          await sendWarningNotification(title, message);
          break;
      }
      
      // Mark as processed
      processedEntries.add(hash);
      processed = true;
      break; // Stop checking patterns once we've matched one
    }
  }
  
  return processed;
}

/**
 * Check all log files for new entries
 */
export async function checkAllLogs(): Promise<void> {
  const logFiles = getLogFiles();
  for (const filePath of logFiles) {
    await processLogFile(filePath);
  }
}

// Optional: Function to start monitoring logs at a specific interval
let monitorInterval: NodeJS.Timeout | null = null;

export function startLogMonitor(intervalMs = 30000): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
  }
  
  monitorInterval = setInterval(async () => {
    await checkAllLogs();
  }, intervalMs);
  
  // Initial check
  checkAllLogs().catch(console.error);
}

export function stopLogMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
} 