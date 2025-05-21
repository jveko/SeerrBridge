import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createAndVerifyLogsDirectory } from "@/lib/create-logs-dir";

export async function GET(request: NextRequest) {
  try {
    // Step 1: Verify logs directory
    const logsCheckResult = createAndVerifyLogsDirectory();
    
    // Step 2: Attempt to create the processed entries file
    const appRoot = process.cwd();
    const logsDir = path.join(appRoot, 'logs');
    const processedEntriesFile = path.join(logsDir, 'processed_entries.json');
    
    let fileCreated = false;
    let fileContent = null;
    let fileError = null;
    
    try {
      // Only try to create file if directory check succeeded
      if (logsCheckResult.success) {
        fs.writeFileSync(processedEntriesFile, JSON.stringify([]), 'utf8');
        fileCreated = fs.existsSync(processedEntriesFile);
        
        if (fileCreated) {
          fileContent = JSON.parse(fs.readFileSync(processedEntriesFile, 'utf8'));
        }
      }
    } catch (error) {
      fileError = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // Step 3: Get a list of all files in the logs directory
    let logFiles: string[] = [];
    if (fs.existsSync(logsDir)) {
      try {
        logFiles = fs.readdirSync(logsDir);
      } catch (error) {
        console.error("Error reading logs directory:", error);
      }
    }
    
    // Return all results
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      logs_directory: logsCheckResult,
      processed_entries_file: {
        path: processedEntriesFile,
        created: fileCreated,
        content: fileContent,
        error: fileError
      },
      files_in_logs: logFiles
    });
  } catch (error) {
    console.error("Error in logs check endpoint:", error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      },
      { status: 500 }
    );
  }
} 