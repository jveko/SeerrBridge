import { NextRequest, NextResponse } from "next/server";
import { readNotificationSettingsFromFile, sendDiscordWebhook, addNotificationToHistoryFile } from "@/lib/server-notifications";
import { NotificationType } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const settings = await readNotificationSettingsFromFile();
    
    if (!settings.discord_webhook_url) {
      return NextResponse.json(
        { error: "No Discord webhook URL configured" },
        { status: 400 }
      );
    }

    // Parse request body to check if a specific notification type was requested
    const body = await request.json().catch(() => ({}));
    const type = (body.type || "success") as NotificationType;
    
    // Validate the notification type
    if (!["success", "error", "warning"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid notification type. Must be 'success', 'error', or 'warning'" },
        { status: 400 }
      );
    }
    
    // Check if this type of notification is enabled
    let isEnabled = false;
    switch (type) {
      case "success":
        isEnabled = settings.notify_on_success;
        break;
      case "error":
        isEnabled = settings.notify_on_error;
        break;
      case "warning":
        isEnabled = settings.notify_on_warning;
        break;
    }
    
    if (!isEnabled) {
      return NextResponse.json(
        { error: `Notifications for type '${type}' are disabled in settings` },
        { status: 400 }
      );
    }
    
    // Create test notification content based on type
    let title: string;
    let message: string;
    
    switch (type) {
      case "success":
        title = "Test Success Notification";
        message = "This is a test success notification from BridgeBoard. If you can see this message, your success notifications are working correctly!";
        break;
      case "error":
        title = "Test Error Notification";
        message = "This is a test error notification from BridgeBoard. If you can see this message, your error notifications are working correctly!";
        break;
      case "warning":
        title = "Test Warning Notification";
        message = "This is a test warning notification from BridgeBoard. If you can see this message, your warning notifications are working correctly!";
        break;
      default:
        title = "Test Notification";
        message = "This is a test notification from BridgeBoard.";
    }

    // Generate a unique ID for the notification
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    // Send the test notification
    const success = await sendDiscordWebhook(
      settings.discord_webhook_url,
      type,
      title,
      message,
      {
        "Status": "Your webhook is working correctly!",
        "Type": type,
        "Environment": process.env.NODE_ENV || "development"
      }
    );
    
    // Store the notification in history file
    await addNotificationToHistoryFile({
      id,
      type,
      title,
      message,
      details: {
        "Status": "Your webhook is working correctly!",
        "Type": type,
        "Environment": process.env.NODE_ENV || "development"
      },
      timestamp: new Date().toISOString(),
      successful: success
    });
    
    if (success) {
      return NextResponse.json({ 
        message: `Test ${type} notification sent successfully` 
      });
    } else {
      return NextResponse.json(
        { error: `Failed to send test ${type} notification` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Test webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send test notification" },
      { status: 500 }
    );
  }
} 