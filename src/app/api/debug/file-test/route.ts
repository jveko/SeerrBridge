import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const appRoot = process.cwd();
    console.log(`[DEBUG API] Current working directory: ${appRoot}`);
    
    // Results object to return
    const results = {
      cwd: appRoot,
      files: [] as string[],
      logs_directory: {
        exists: false,
        path: "",
        files: [] as string[]
      },
      processed_entries_file: {
        exists: false,
        path: "",
        created_now: false,
        content: null as any,
        logs_path: "",
        logs_exists: false,
        logs_content: null as any,
        logs_created_now: false
      },
      test_file: {
        created: false,
        path: ""
      }
    };
    
    // List files in root directory
    try {
      results.files = fs.readdirSync(appRoot);
    } catch (error) {
      console.error(`[DEBUG API] Error listing files in root directory:`, error);
    }
    
    // Check for logs directory
    const logsDir = path.join(appRoot, 'logs');
    results.logs_directory.path = logsDir;
    
    if (fs.existsSync(logsDir)) {
      results.logs_directory.exists = true;
      try {
        results.logs_directory.files = fs.readdirSync(logsDir);
      } catch (error) {
        console.error(`[DEBUG API] Error listing log files:`, error);
      }
    }
    
    // Check for processed entries file in logs dir
    const logsProcessedEntriesPath = path.join(logsDir, 'processed_entries.json');
    results.processed_entries_file.logs_path = logsProcessedEntriesPath;
    results.processed_entries_file.logs_exists = false;

    if (fs.existsSync(logsDir)) {
      if (fs.existsSync(logsProcessedEntriesPath)) {
        results.processed_entries_file.logs_exists = true;
        try {
          const content = fs.readFileSync(logsProcessedEntriesPath, 'utf8');
          results.processed_entries_file.logs_content = JSON.parse(content);
        } catch (error) {
          console.error(`[DEBUG API] Error reading logs processed entries file:`, error);
          results.processed_entries_file.logs_content = { error: "Failed to read file" };
        }
      } else {
        // Try to create the file
        try {
          // Create logs directory if it doesn't exist
          if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
          }
          
          fs.writeFileSync(logsProcessedEntriesPath, JSON.stringify([]), 'utf8');
          results.processed_entries_file.logs_created_now = true;
          results.processed_entries_file.logs_content = [];
        } catch (error) {
          console.error(`[DEBUG API] Error creating processed entries file in logs:`, error);
        }
      }
    }
    
    // Check for processed entries file
    const processedEntriesPath = path.join(appRoot, 'processed_log_entries.json');
    results.processed_entries_file.path = processedEntriesPath;
    
    if (fs.existsSync(processedEntriesPath)) {
      results.processed_entries_file.exists = true;
      try {
        const content = fs.readFileSync(processedEntriesPath, 'utf8');
        results.processed_entries_file.content = JSON.parse(content);
      } catch (error) {
        console.error(`[DEBUG API] Error reading processed entries file:`, error);
        results.processed_entries_file.content = { error: "Failed to read file" };
      }
    } else {
      // Try to create the file
      try {
        fs.writeFileSync(processedEntriesPath, JSON.stringify([]), 'utf8');
        results.processed_entries_file.created_now = true;
        results.processed_entries_file.content = [];
      } catch (error) {
        console.error(`[DEBUG API] Error creating processed entries file:`, error);
      }
    }
    
    // Create a test file
    const testFilePath = path.join(appRoot, 'api-test-file.json');
    results.test_file.path = testFilePath;
    
    try {
      fs.writeFileSync(testFilePath, JSON.stringify({ test: true, timestamp: new Date().toISOString() }), 'utf8');
      results.test_file.created = true;
      
      // Clean up test file
      fs.unlinkSync(testFilePath);
    } catch (error) {
      console.error(`[DEBUG API] Error with test file:`, error);
    }
    
    return NextResponse.json(results);
  } catch (error) {
    console.error("[DEBUG API] Error in debug endpoint:", error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      },
      { status: 500 }
    );
  }
} 