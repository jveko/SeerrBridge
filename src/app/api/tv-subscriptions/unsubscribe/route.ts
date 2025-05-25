import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { show_title, trakt_show_id, season } = body;

    // Validate required parameters
    if (!show_title) {
      return NextResponse.json({ error: "Show title is required" }, { status: 400 });
    }

    // Find the discrepancies file
    const APP_ROOT = process.cwd();
    const possiblePaths = [
      path.join(APP_ROOT, "logs", "episode_discrepancies.json"), // In logs directory
      path.join(APP_ROOT, "episode_discrepancies.json"), // Root directory (fallback)
      path.join(APP_ROOT, "data", "episode_discrepancies.json"), // Data directory (fallback)
    ];
    
    let discrepanciesFilePath = "";
    let fileFound = false;
    
    // Try each path until we find the file
    for (const testPath of possiblePaths) {
      try {
        if (fs.existsSync(testPath)) {
          discrepanciesFilePath = testPath;
          fileFound = true;
          console.log(`Found discrepancies file at: ${discrepanciesFilePath}`);
          break;
        }
      } catch (error) {
        console.error(`Error checking path ${testPath}:`, error);
      }
    }
    
    if (!fileFound) {
      return NextResponse.json({ error: "Discrepancies file not found" }, { status: 404 });
    }

    // Read the current file content
    const content = await fs.promises.readFile(discrepanciesFilePath, "utf8");
    let data;
    try {
      data = JSON.parse(content);
    } catch (error) {
      return NextResponse.json({ error: "Failed to parse discrepancies file" }, { status: 500 });
    }

    // Make sure the discrepancies field exists and is an array
    if (!data || !data.discrepancies || !Array.isArray(data.discrepancies)) {
      return NextResponse.json({ error: "Invalid discrepancies file format" }, { status: 500 });
    }

    // Find the show to remove
    const showIndex = data.discrepancies.findIndex((show: any) => {
      const titleMatch = show.show_title === show_title;
      const seasonMatch = show.season_number === season || show.season === season;
      const traktMatch = !trakt_show_id || show.trakt_show_id === trakt_show_id;
      
      return titleMatch && seasonMatch && traktMatch;
    });

    if (showIndex === -1) {
      return NextResponse.json({ error: "Show not found in subscriptions" }, { status: 404 });
    }

    const showToRemove = data.discrepancies[showIndex];
    
    // Check for required environment variables
    const overseerrBase = process.env.OVERSEERR_BASE;
    const overseerrApiKey = process.env.OVERSEERR_API_KEY;
    
    let overseerrDeleteSuccess = false;
    let overseerrError = null;

    // Attempt to delete from Overseerr if we have the required config and seerr_id
    if (overseerrBase && overseerrApiKey && showToRemove.seerr_id) {
      try {
        console.log(`Attempting to delete Overseerr request ${showToRemove.seerr_id} for "${show_title}"`);
        
        const deleteUrl = `${overseerrBase}/api/v1/request/${showToRemove.seerr_id}`;
        const deleteResponse = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'X-Api-Key': overseerrApiKey,
            'Content-Type': 'application/json',
          },
        });

        if (deleteResponse.ok) {
          overseerrDeleteSuccess = true;
          console.log(`Successfully deleted Overseerr request ${showToRemove.seerr_id}`);
        } else {
          const errorText = await deleteResponse.text();
          overseerrError = `Failed to delete from Overseerr: ${deleteResponse.status} ${deleteResponse.statusText} - ${errorText}`;
          console.error(overseerrError);
        }
      } catch (error) {
        overseerrError = `Error deleting from Overseerr: ${error instanceof Error ? error.message : String(error)}`;
        console.error(overseerrError);
      }
    } else {
      if (!overseerrBase || !overseerrApiKey) {
        overseerrError = "Overseerr configuration missing (OVERSEERR_BASE or OVERSEERR_API_KEY not set)";
        console.warn(overseerrError);
      } else if (!showToRemove.seerr_id) {
        overseerrError = "No Overseerr request ID found for this show (older subscription without seerr_id)";
        console.warn(overseerrError);
      }
    }

    // Create a backup of the file before modifying
    const backupPath = `${discrepanciesFilePath}.backup`;
    await fs.promises.writeFile(backupPath, content);
    console.log(`Backup created at: ${backupPath}`);

    // Remove the show from the array
    data.discrepancies.splice(showIndex, 1);

    // Write the updated data back to the file
    try {
      await fs.promises.writeFile(discrepanciesFilePath, JSON.stringify(data, null, 2));
      console.log(`Successfully unsubscribed from "${show_title}" (Season ${season})`);
      
      // Prepare response message
      let message = `Successfully unsubscribed from "${show_title}" (Season ${season})`;
      let warnings = [];
      
      if (overseerrDeleteSuccess) {
        message += " and removed from Overseerr";
      } else if (overseerrError) {
        warnings.push(overseerrError);
      }
      
      return NextResponse.json({ 
        success: true, 
        message,
        overseerr_deleted: overseerrDeleteSuccess,
        warnings: warnings.length > 0 ? warnings : undefined
      });
    } catch (error) {
      console.error("Error writing to discrepancies file:", error);
      return NextResponse.json({ error: "Failed to update discrepancies file" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error unsubscribing from show:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 