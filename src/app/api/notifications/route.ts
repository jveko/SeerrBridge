import { NextRequest, NextResponse } from "next/server";
import { 
  readNotificationSettingsFromFile, 
  writeNotificationSettings 
} from "@/lib/server-notifications";

// GET handler for notification settings
export async function GET(request: NextRequest) {
  try {
    const settings = await readNotificationSettingsFromFile();
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read notification settings" },
      { status: 500 }
    );
  }
}

// POST handler for updating notification settings
export async function POST(request: NextRequest) {
  try {
    const updatedSettings = await request.json();
    
    // Validate the incoming webhook URL (basic validation)
    if (
      updatedSettings.discord_webhook_url &&
      typeof updatedSettings.discord_webhook_url === "string" &&
      !updatedSettings.discord_webhook_url.startsWith("https://discord.com/api/webhooks/")
    ) {
      return NextResponse.json(
        { error: "Invalid Discord webhook URL" },
        { status: 400 }
      );
    }
    
    const success = await writeNotificationSettings(updatedSettings);
    
    if (success) {
      return NextResponse.json({ message: "Notification settings updated successfully" });
    } else {
      return NextResponse.json(
        { error: "Failed to update notification settings" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update notification settings" },
      { status: 500 }
    );
  }
} 