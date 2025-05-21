import { NextRequest, NextResponse } from "next/server";
import { markNotificationsAsViewed, countUnviewedNotifications } from "@/lib/server-notifications";

/**
 * POST handler to mark notifications as viewed
 * This endpoint will mark all notifications before the given timestamp as viewed
 * and return the count of remaining unviewed notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { viewTimestamp } = body;
    
    if (!viewTimestamp) {
      return NextResponse.json(
        { error: "Missing required viewTimestamp field" },
        { status: 400 }
      );
    }
    
    const remainingUnviewed = await markNotificationsAsViewed(viewTimestamp);
    
    return NextResponse.json({ 
      success: true,
      unviewedCount: remainingUnviewed
    });
  } catch (error) {
    console.error("Error marking notifications as viewed:", error);
    
    return NextResponse.json(
      { error: "Failed to mark notifications as viewed" },
      { status: 500 }
    );
  }
}

/**
 * GET handler to get count of unviewed notifications
 */
export async function GET(request: NextRequest) {
  try {
    const unviewedCount = await countUnviewedNotifications();
    
    return NextResponse.json({ 
      unviewedCount
    });
  } catch (error) {
    console.error("Error getting unviewed notification count:", error);
    
    return NextResponse.json(
      { error: "Failed to get unviewed notification count" },
      { status: 500 }
    );
  }
} 