import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createLogsDir } from "@/lib/create-logs-dir";

// Define the path to the configuration file
const CONFIG_FILE_PATH = path.join(process.cwd(), "logs", "log_config.json");

// Default log configuration
const defaultLogConfiguration = {
  version: "1.0.0",
  defaultConfig: true,
  logTypes: [],  // Start with empty log types
  logDisplays: [] // Start with empty display rules
};

// Helper function to save configuration to a file
async function saveConfiguration(config: any) {
  try {
    // Create logs directory if it doesn't exist
    await createLogsDir();
    
    // Save the current config as a backup if it exists
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const backupPath = path.join(
        process.cwd(),
        "logs",
        `log_config_backup_${Date.now()}.json`
      );
      fs.copyFileSync(CONFIG_FILE_PATH, backupPath);
    }
    
    // Write the new configuration
    fs.writeFileSync(
      CONFIG_FILE_PATH,
      JSON.stringify(config, null, 2)
    );
    
    return true;
  } catch (error) {
    console.error("Error saving log configuration:", error);
    return false;
  }
}

// Helper function to load configuration from a file
async function loadConfiguration() {
  try {
    // Create logs directory if it doesn't exist
    await createLogsDir();
    
    // Check if configuration file exists
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      // If not, create it with default configuration
      await saveConfiguration(defaultLogConfiguration);
      return defaultLogConfiguration;
    }
    
    // Read and parse the configuration file
    const configData = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
    return JSON.parse(configData);
  } catch (error) {
    console.error("Error loading log configuration:", error);
    return defaultLogConfiguration;
  }
}

// GET handler for retrieving the current configuration
export async function GET() {
  try {
    const config = await loadConfiguration();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Error in GET /api/logs/config:", error);
    return NextResponse.json(
      { error: "Failed to load log configuration" },
      { status: 500 }
    );
  }
}

// POST handler for saving a new configuration
export async function POST(request: Request) {
  try {
    const config = await request.json();
    
    // Basic validation
    if (!config.logTypes || !config.logDisplays || !config.version) {
      return NextResponse.json(
        { error: "Invalid configuration format" },
        { status: 400 }
      );
    }
    
    const success = await saveConfiguration(config);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Failed to save configuration" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in POST /api/logs/config:", error);
    return NextResponse.json(
      { error: "Failed to save log configuration" },
      { status: 500 }
    );
  }
} 