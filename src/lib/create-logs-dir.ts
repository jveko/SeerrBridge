import fs from 'fs';
import path from 'path';

/**
 * This is a utility function to create and verify the logs directory.
 * It creates a test file inside the logs directory to ensure write permissions.
 */
export function createAndVerifyLogsDirectory(): { 
  success: boolean; 
  directory: string; 
  error?: string;
  testFile?: string;
} {
  try {
    const appRoot = process.cwd();
    const logsDir = path.join(appRoot, 'logs');
    console.log(`Verifying logs directory at: ${logsDir}`);
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      console.log(`Logs directory doesn't exist, creating it now`);
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Verify directory was created
    if (!fs.existsSync(logsDir)) {
      return { 
        success: false, 
        directory: logsDir, 
        error: 'Failed to create logs directory' 
      };
    }
    
    // Test write permissions by creating a test file
    const testFile = path.join(logsDir, 'directory-test.json');
    const testData = {
      test: true,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(testFile, JSON.stringify(testData), 'utf8');
    
    // Verify the test file was created
    if (!fs.existsSync(testFile)) {
      return { 
        success: false, 
        directory: logsDir, 
        error: 'Failed to write test file to logs directory' 
      };
    }
    
    console.log(`Successfully created and verified logs directory at: ${logsDir}`);
    return { 
      success: true, 
      directory: logsDir,
      testFile: testFile 
    };
    
  } catch (error) {
    return { 
      success: false, 
      directory: path.join(process.cwd(), 'logs'), 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Creates the logs directory if it doesn't exist
 * Returns the path to the logs directory
 */
export async function createLogsDir(): Promise<string> {
  const logsDir = path.join(process.cwd(), 'logs');
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  return logsDir;
}

// If this file is executed directly, run the function
if (require.main === module) {
  const result = createAndVerifyLogsDirectory();
  console.log('Result:', result);
  
  // Clean up test file if it was created
  if (result.success && result.testFile && fs.existsSync(result.testFile)) {
    try {
      fs.unlinkSync(result.testFile);
      console.log(`Cleaned up test file: ${result.testFile}`);
    } catch (error) {
      console.error(`Failed to clean up test file: ${error}`);
    }
  }
} 