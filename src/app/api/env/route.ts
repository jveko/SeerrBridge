import { NextRequest, NextResponse } from "next/server";
import { readEnvFile, writeEnvFile } from "@/lib/server-utils";
import path from "path";

// Helper function to get the .env file path
function getEnvFilePath() {
  return path.join(process.cwd(), ".env");
}

// Redact sensitive values
function redactSensitiveValues(envVars: Record<string, string>): Record<string, string> {
  const redactedEnvVars = { ...envVars };
  
  // List of sensitive keys (lowercase for case-insensitive comparison)
  const sensitiveKeys = ["token", "key", "password", "secret"];
  
  for (const key of Object.keys(redactedEnvVars)) {
    // Check if the key contains any sensitive words
    if (sensitiveKeys.some(sensitiveKey => key.toLowerCase().includes(sensitiveKey))) {
      // Redact the value to show only the first and last characters
      const value = redactedEnvVars[key];
      if (value.length > 8) {
        redactedEnvVars[key] = `${value.substring(0, 3)}******${value.substring(value.length - 3)}`;
      } else {
        redactedEnvVars[key] = "********";
      }
    }
  }
  
  return redactedEnvVars;
}

// GET handler for environment variables
export async function GET(request: NextRequest) {
  try {
    const envFilePath = getEnvFilePath();
    const envVars = await readEnvFile(envFilePath);
    
    // Redact sensitive values before sending them to the client
    const redactedEnvVars = redactSensitiveValues(envVars);
    
    return NextResponse.json(redactedEnvVars);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read environment variables" },
      { status: 500 }
    );
  }
}

// POST handler for updating environment variables
export async function POST(request: NextRequest) {
  try {
    const envFilePath = getEnvFilePath();
    
    // Read current env vars to compare with the updated ones
    const currentEnvVars = await readEnvFile(envFilePath);
    const updatedEnvVars = await request.json();
    
    // Merge updated values with current ones, preserving redacted values
    const mergedEnvVars: Record<string, string> = { ...currentEnvVars };
    
    // List of sensitive keys (lowercase for case-insensitive comparison)
    const sensitiveKeys = ["token", "key", "password", "secret"];
    
    for (const [key, value] of Object.entries(updatedEnvVars)) {
      // If the key exists and the value is not a redacted one
      if (key in mergedEnvVars && typeof value === "string") {
        const isSensitive = sensitiveKeys.some(sensitiveKey => key.toLowerCase().includes(sensitiveKey));
        
        // Skip updating if the value is redacted and it's a sensitive field
        if (isSensitive && value.includes("******")) {
          continue;
        }
        
        mergedEnvVars[key] = value;
      }
    }
    
    // Write the updated environment variables to the .env file
    const success = await writeEnvFile(envFilePath, mergedEnvVars);
    
    if (success) {
      return NextResponse.json({ message: "Environment variables updated successfully" });
    } else {
      return NextResponse.json(
        { error: "Failed to update environment variables" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update environment variables" },
      { status: 500 }
    );
  }
} 