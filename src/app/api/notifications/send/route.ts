import { NextRequest, NextResponse } from "next/server";
import { 
  readNotificationSettingsFromFile, 
  sendDiscordWebhook,
  addNotificationToHistoryFile
} from "@/lib/server-notifications";
import { NotificationType } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { type, title, message, details } = body;
    
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
        { error: "Invalid notification type. Must be 'success', 'error', or 'warning'" },
        { status: 400 }
      );
    }
    
    // Get settings to check if this notification type is enabled
    const settings = await readNotificationSettingsFromFile();
    const webhookUrl = settings.discord_webhook_url;
    
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Discord webhook URL not configured" },
        { status: 400 }
      );
    }
    
    // Check if this notification type is enabled
    let isEnabled = false;
    switch (type as NotificationType) {
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
        { message: `Notifications for type '${type}' are disabled` },
        { status: 200 }
      );
    }
    
    // Generate a unique ID for the notification
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    // Send the notification
    const success = await sendDiscordWebhook(
      webhookUrl,
      type as NotificationType,
      title,
      message,
      details
    );
    
    console.log(`[API] ${success ? 'Successfully sent' : 'Failed to send'} webhook notification: ${title}`);
    
    // Ensure notification history includes source information
    const notificationDetails = {
      ...details,
      webhook_success: success ? "true" : "false"
    };
    
    // Store in notification history file
    const historySuccess = await addNotificationToHistoryFile({
      id,
      type: type as NotificationType,
      title,
      message,
      details: notificationDetails,
      timestamp: details?.timestamp || new Date().toISOString(),
      successful: success
    });
    
    console.log(`[API] ${historySuccess ? 'Successfully added' : 'Failed to add'} notification to history: ${title}`);
    
    if (success) {
      return NextResponse.json({ 
        message: "Notification sent successfully",
        notification_id: id
      });
    } else {
      return NextResponse.json(
        { 
          error: "Failed to send notification to webhook", 
          added_to_history: historySuccess,
          notification_id: id
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
} 