import { 
  sendSuccessNotification, 
  sendErrorNotification, 
  sendWarningNotification 
} from './notifications';

// In-memory log buffer to capture console logs
interface LogEntry {
  level: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  processed: boolean;
  details?: Record<string, string>;
}

// Keep a buffer of recent logs in memory
const logBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 1000;

// Flag to indicate if monitoring is active
let isMonitoringActive = false;
let processingInterval: NodeJS.Timeout | null = null;

// Original console methods
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

/**
 * Extract title and message from console log
 */
function parseLogMessage(args: any[]): { title: string, message: string } {
  if (args.length === 0) {
    return { title: 'Unknown', message: '' };
  }
  
  // Check for structured log format: [timestamp] emoji Title: Message
  if (typeof args[0] === 'string') {
    const logStr = args[0];
    
    // Success log pattern
    const successMatch = logStr.match(/\[.*\]\s+✅\s+(.*?):\s+(.*)/);
    if (successMatch) {
      return { title: successMatch[1], message: successMatch[2] };
    }
    
    // Error log pattern
    const errorMatch = logStr.match(/\[.*\]\s+❌\s+(.*?):\s+(.*)/);
    if (errorMatch) {
      return { title: errorMatch[1], message: errorMatch[2] };
    }
    
    // Warning log pattern
    const warningMatch = logStr.match(/\[.*\]\s+⚠️\s+(.*?):\s+(.*)/);
    if (warningMatch) {
      return { title: warningMatch[1], message: warningMatch[2] };
    }
  }
  
  // If we can't parse the structured format, use a generic approach
  const logString = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  return { title: 'Log Entry', message: logString };
}

/**
 * Intercept console logs and store them in the buffer
 */
function setupConsoleInterceptors() {
  // Override console.log to capture success logs
  console.log = function(...args: any[]) {
    originalConsoleLog.apply(console, args);
    
    const logStr = args[0]?.toString() || '';
    if (logStr.includes('✅')) {
      const { title, message } = parseLogMessage(args);
      addToLogBuffer('success', title, message);
    } else {
      // Regular logs without success indicator are treated as info
      const { title, message } = parseLogMessage(args);
      addToLogBuffer('info', title, message);
    }
  };
  
  // Override console.warn to capture warning logs
  console.warn = function(...args: any[]) {
    originalConsoleWarn.apply(console, args);
    
    const { title, message } = parseLogMessage(args);
    addToLogBuffer('warning', title, message);
  };
  
  // Override console.error to capture error logs
  console.error = function(...args: any[]) {
    originalConsoleError.apply(console, args);
    
    const { title, message } = parseLogMessage(args);
    addToLogBuffer('error', title, message);
  };
}

/**
 * Restore original console methods
 */
function restoreConsole() {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
}

/**
 * Add a log entry to the buffer
 */
function addToLogBuffer(
  level: 'success' | 'error' | 'warning' | 'info', 
  title: string, 
  message: string, 
  details?: Record<string, string>
) {
  // Add to the beginning of the array for faster access to recent logs
  logBuffer.unshift({
    level,
    title,
    message,
    timestamp: new Date(),
    processed: false,
    details
  });
  
  // Keep buffer size under control
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.pop();
  }
}

/**
 * Process new log entries and send notifications
 */
async function processNewLogs() {
  const unprocessedLogs = logBuffer.filter(log => !log.processed);
  
  for (const log of unprocessedLogs) {
    try {
      switch (log.level) {
        case 'success':
          await sendSuccessNotification(log.title, log.message, log.details);
          break;
        case 'error':
          await sendErrorNotification(log.title, log.message, log.details);
          break;
        case 'warning':
          await sendWarningNotification(log.title, log.message, log.details);
          break;
        // Don't send notifications for info logs
      }
      log.processed = true;
    } catch (error) {
      console.error('Failed to send notification for log:', error);
      // Still mark as processed to avoid infinite retry
      log.processed = true;
    }
  }
}

/**
 * Start monitoring console logs and sending notifications
 */
export function startMonitoring(intervalMs = 30000) {
  if (isMonitoringActive) {
    return;
  }
  
  isMonitoringActive = true;
  setupConsoleInterceptors();
  
  // Set up interval to process new logs
  processingInterval = setInterval(async () => {
    await processNewLogs();
  }, intervalMs);
  
  // Initial processing
  processNewLogs().catch(err => {
    originalConsoleError('Error processing logs:', err);
  });
}

/**
 * Stop monitoring console logs
 */
export function stopMonitoring() {
  if (!isMonitoringActive) {
    return;
  }
  
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }
  
  restoreConsole();
  isMonitoringActive = false;
}

/**
 * Manually trigger log processing
 */
export function processLogsNow() {
  return processNewLogs();
} 