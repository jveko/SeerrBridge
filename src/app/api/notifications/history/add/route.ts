import { NextRequest, NextResponse } from "next/server";
import { addNotificationToHistoryFile } from "@/lib/server-notifications";
import { NotificationHistoryItem } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    // Parse the notification from the request body
    const notification = await request.json() as NotificationHistoryItem;
    
    // Validate the required fields
    if (!notification.id || !notification.type || !notification.title || !notification.message || !notification.timestamp) {
      return NextResponse.json(
        { error: "Missing required notification fields" },
        { status: 400 }
      );
    }
    
    // Add the notification to the history file
    const success = await addNotificationToHistoryFile(notification);
    
    if (!success) {
      return NextResponse.json(
        { error: "Failed to add notification to history file" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding notification to history:", error);
    
    return NextResponse.json(
      { error: "Failed to add notification to history" },
      { status: 500 }
    );
  }
} 