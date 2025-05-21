import { NextRequest, NextResponse } from "next/server";
import { NotificationType } from "@/lib/notifications";
import { addToConsoleBuffer } from "../background/route";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { type, title, message } = body;
    
    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields: type, title, or message" },
        { status: 400 }
      );
    }
    
    // Make sure type is valid
    if (!["success", "error", "warning"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid log type. Must be 'success', 'error', or 'warning'" },
        { status: 400 }
      );
    }
    
    // Add to the server-side buffer
    addToConsoleBuffer(type as NotificationType, title, message);
    
    // Log to server console as well
    const timestamp = new Date().toISOString();
    switch (type) {
      case "success":
        console.log(`[${timestamp}] ✅ ${title}: ${message}`);
        break;
      case "error":
        console.error(`[${timestamp}] ❌ ${title}: ${message}`);
        break;
      case "warning":
        console.warn(`[${timestamp}] ⚠️ ${title}: ${message}`);
        break;
    }
    
    return NextResponse.json({ message: "Log entry recorded successfully" });
  } catch (error) {
    console.error("Error recording log entry:", error);
    return NextResponse.json(
      { error: "Failed to record log entry" },
      { status: 500 }
    );
  }
} 