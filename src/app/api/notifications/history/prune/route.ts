import { NextRequest, NextResponse } from "next/server";
import { pruneNotificationHistoryFile } from "@/lib/server-notifications";

/**
 * GET handler for pruning older notifications
 * This endpoint will remove all notifications older than 24 hours
 * and return the count of remaining notifications
 */
export async function GET(request: NextRequest) {
  try {
    const remainingCount = await pruneNotificationHistoryFile();
    
    return NextResponse.json({ 
      success: true,
      message: "Successfully pruned notification history",
      remaining: remainingCount
    });
  } catch (error) {
    console.error("Error pruning notification history:", error);
    
    return NextResponse.json(
      { error: "Failed to prune notification history" },
      { status: 500 }
    );
  }
} 