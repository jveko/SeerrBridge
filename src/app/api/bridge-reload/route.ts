import { NextResponse } from "next/server";

// This is the URL where your SeerrBridge is running
const SEERRBRIDGE_URL = process.env.SEERRBRIDGE_URL || "http://localhost:8777";

export async function POST() {
  console.log(`[bridge-reload] Received reload request. Will forward to ${SEERRBRIDGE_URL}/reload-env`);
  
  try {
    // Forward the request to SeerrBridge's reload-env endpoint
    console.log(`[bridge-reload] Attempting to connect to SeerrBridge at ${SEERRBRIDGE_URL}/reload-env`);
    
    const response = await fetch(`${SEERRBRIDGE_URL}/reload-env`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
      // This is important for production environments
      next: { revalidate: 0 }
    });

    console.log(`[bridge-reload] Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Could not read response body");
      console.error(`[bridge-reload] Failed response: ${errorText}`);
      throw new Error(`Failed to reload environment: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[bridge-reload] Success response:`, data);
    
    return NextResponse.json({
      status: "success",
      message: "Environment variables reloaded successfully",
      seerrbridge_response: data
    });
  } catch (error) {
    console.error(`[bridge-reload] Error details:`, error);
    
    // Provide more detailed error information
    let errorMessage = "Failed to connect to SeerrBridge";
    let errorDetails = String(error);
    
    if (error instanceof TypeError && errorDetails.includes("fetch")) {
      errorMessage = `Connection to SeerrBridge failed (${SEERRBRIDGE_URL}/reload-env)`;
      errorDetails = "This may be because SeerrBridge is not running or the URL is incorrect.";
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: errorDetails,
        url_tried: `${SEERRBRIDGE_URL}/reload-env` 
      },
      { status: 500 }
    );
  }
} 