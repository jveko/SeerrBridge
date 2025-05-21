import { NextRequest, NextResponse } from "next/server";
import { readNotificationHistoryFromFile } from "@/lib/server-notifications";

// GET handler for notification history
export async function GET(request: NextRequest) {
  try {
    const history = await readNotificationHistoryFromFile();
    return NextResponse.json({ history });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to retrieve notification history" },
      { status: 500 }
    );
  }
} 