import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to validate if a URL is accessible
 * This is used to check if the OVERSEERR_BASE URL is valid and reachable
 */
export async function GET(request: NextRequest) {
  try {
    // Get the URL from the query string
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");
    
    // Validate URL parameter
    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }
    
    // Attempt to fetch the URL
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(url, { 
        method: "GET",
        signal: controller.signal,
        headers: {
          // Add a user agent to avoid being blocked by some servers
          "User-Agent": "SeerrBridge-Validator/1.0"
        }
      });
      
      clearTimeout(timeoutId);
      
      // Return the status and response information
      return NextResponse.json({
        status: response.status,
        message: response.ok ? "URL is accessible" : `Server responded with ${response.status} ${response.statusText}`,
        ok: response.ok
      });
    } catch (error) {
      // Handle network errors, timeouts, etc.
      let errorMessage = "Connection failed";
      
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Connection timed out after 5 seconds";
        } else {
          errorMessage = error.message;
        }
      }
      
      return NextResponse.json({
        status: 0,
        message: errorMessage,
        ok: false,
        error: error instanceof Error ? error.name : "Unknown error"
      });
    }
  } catch (error) {
    // Handle any unexpected errors in the API endpoint itself
    return NextResponse.json(
      { 
        status: 500,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
} 