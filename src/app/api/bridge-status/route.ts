import { NextResponse } from "next/server";

// This is the URL where your SeerrBridge is running
const SEERRBRIDGE_URL = process.env.SEERRBRIDGE_URL || "http://localhost:8777";

export async function GET() {
  try {
    const response = await fetch(`${SEERRBRIDGE_URL}/status`, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
      // This is important for production environments
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching SeerrBridge status:", error);
    return NextResponse.json(
      { error: "Failed to connect to SeerrBridge" },
      { status: 500 }
    );
  }
} 